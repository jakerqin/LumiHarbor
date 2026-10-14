"""SigLIP 2 推理串行化：MPS 后端非线程安全，并发首推会把 shader 缓存写坏、线程死循环"""
import sys
import threading
import time
import types
from contextlib import nullcontext
from unittest.mock import patch

import pytest

from app.tools import clip


class _Vec(list):
    """模拟 tensor 上 _as_unit_list 用到的几个方法"""
    ndim = 1

    def detach(self):
        return self

    def norm(self, p=2):
        return 1.0

    def __truediv__(self, other):
        return self

    def float(self):
        return self

    def cpu(self):
        return self

    def tolist(self):
        return list(self)


class _ConcurrencyProbeModel:
    """推理期间如果有第二个线程进来就记下来"""

    def __init__(self):
        self.active = 0
        self.max_active = 0
        self._guard = threading.Lock()

    def get_text_features(self, **_):
        with self._guard:
            self.active += 1
            self.max_active = max(self.max_active, self.active)
        time.sleep(0.05)
        with self._guard:
            self.active -= 1
        return _Vec([1.0, 0.0])


def _processor(**_):
    return {"input_ids": types.SimpleNamespace(to=lambda device: None)}


@pytest.fixture
def fake_torch():
    module = types.ModuleType("torch")
    module.no_grad = nullcontext
    with patch.dict(sys.modules, {"torch": module}):
        yield


@pytest.fixture
def loaded_model(fake_torch, monkeypatch):
    model = _ConcurrencyProbeModel()
    monkeypatch.setattr(clip, "_model", model)
    monkeypatch.setattr(clip, "_processor", _processor)
    monkeypatch.setattr(clip, "_device", "cpu")
    ready = threading.Event()
    ready.set()
    monkeypatch.setattr(clip, "_ready", ready)
    return model


def test_concurrent_text_queries_run_one_at_a_time(loaded_model):
    threads = [threading.Thread(target=clip.encode_text, args=("婴儿",)) for _ in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5)
    assert loaded_model.max_active == 1


def test_query_does_not_wait_longer_than_frontend_timeout(monkeypatch):
    """模型没就绪时最多等 QUERY_WAIT_SECONDS，必须小于前端 10s 超时"""
    assert clip.QUERY_WAIT_SECONDS < 10
    monkeypatch.setattr(clip, "_model", None)
    monkeypatch.setattr(clip, "_ready", threading.Event())
    monkeypatch.setattr(clip, "_start_load_async", lambda: None)
    monkeypatch.setattr(clip, "QUERY_WAIT_SECONDS", 0.1)

    started = time.monotonic()
    with pytest.raises(RuntimeError):
        clip.encode_text("婴儿")
    assert time.monotonic() - started < 1


def test_warmup_failure_leaves_model_unset(fake_torch, monkeypatch, tmp_path):
    """预热失败时不能留下「_model 有值但没就绪」的半成品状态"""
    monkeypatch.setattr(clip, "_model", None)
    monkeypatch.setattr(clip, "_ready", threading.Event())

    class _Broken:
        def get_text_features(self, **_):
            raise RuntimeError("mps 挂了")

        def to(self, device):
            return self

        def eval(self):
            return self

    fake_transformers = types.ModuleType("transformers")
    fake_transformers.AutoModel = types.SimpleNamespace(from_pretrained=lambda path: _Broken())
    fake_transformers.AutoProcessor = types.SimpleNamespace(from_pretrained=lambda path: _processor)
    sys.modules["torch"].backends = types.SimpleNamespace(mps=types.SimpleNamespace(is_available=lambda: False))
    with patch.dict(sys.modules, {"transformers": fake_transformers}):
        with pytest.raises(RuntimeError):
            clip._load_into_globals(tmp_path)
    assert clip._model is None
    assert clip._load_error is not None
