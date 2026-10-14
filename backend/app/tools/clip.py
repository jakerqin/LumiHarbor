"""SigLIP 2 图文编码。懒加载，查询不阻塞接口。

推理必须串行：PyTorch 的 MPS 后端不是线程安全的。API 的同步接口跑在线程池里，
多个搜索同时做第一次推理时会并发写 MPS 的 shader 缓存（C++ unordered_map），
把哈希表写坏后线程在里面死循环、CPU 100% 且无法结束。加载完成后先预热一次，
让 shader 在「就绪」之前编译好。
"""
import threading
from pathlib import Path
from typing import List

from ..config import settings
from .face.image_io import load_rgb
from .utils import get_logger

logger = get_logger(__name__)

CLIP_MODEL_NAME = "siglip2-base-patch16-256"
CLIP_DIM = 768
CLIP_TEXT_MAX = 64

_model = None
_processor = None
_device = None
_lock = threading.Lock()
_load_started = False
_ready = threading.Event()
_load_error = None
# 所有前向推理共用一把锁（见模块说明）；单条文本 MPS 上约几十毫秒，串行不影响体验
_infer_lock = threading.Lock()
# 搜索等模型就绪的上限：要明显小于前端 10s 超时，等不到就只走词法
QUERY_WAIT_SECONDS = 5


def encode_image(path: str) -> List[float]:
    image = load_rgb(path)
    model, processor, device = _ensure()
    import torch

    inputs = processor(images=image, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}
    with _infer_lock, torch.no_grad():
        feats = model.get_image_features(**inputs)
        return _as_unit_list(feats)


def encode_text(text: str) -> List[float]:
    _wait_ready(QUERY_WAIT_SECONDS)
    return _run_text(_model, _processor, _device, text)


def _run_text(model, processor, device, text: str) -> List[float]:
    import torch

    inputs = processor(
        text=[text],
        padding="max_length",
        max_length=CLIP_TEXT_MAX,
        truncation=True,
        return_tensors="pt",
    )
    inputs = {key: value.to(device) for key, value in inputs.items()}
    with _infer_lock, torch.no_grad():
        feats = model.get_text_features(**inputs)
        return _as_unit_list(feats)


def model_available() -> bool:
    root = Path(settings.CLIP_MODEL_DIR)
    return root.is_dir() and (root / "model.safetensors").is_file()


def warmup() -> None:
    """API 启动时后台预热，避免第一次搜索只走词法。"""
    _start_load_async()


def _wait_ready(timeout: float = 30) -> None:
    if _model is not None and _ready.is_set():
        return
    _start_load_async()
    if not _ready.wait(timeout=timeout):
        raise RuntimeError("SigLIP 2 加载超时")
    if _load_error is not None:
        raise _load_error
    if _model is None:
        raise RuntimeError("SigLIP 2 未就绪")


def _start_load_async() -> None:
    global _load_started, _load_error
    if _model is not None or _load_started:
        return
    with _lock:
        if _model is not None or _load_started:
            return
        _load_started = True
        # 清掉上次失败状态，否则等待方会立刻拿到旧错误
        _load_error = None
        _ready.clear()
    threading.Thread(target=_ensure, name="siglip2-load", daemon=True).start()


def _ensure():
    global _model, _processor, _device, _load_started
    if _model is not None:
        return _model, _processor, _device
    with _lock:
        if _model is not None:
            return _model, _processor, _device
        root = Path(settings.CLIP_MODEL_DIR)
        if not model_available():
            _fail_load(FileNotFoundError(
                f"SigLIP 2 权重不在 {root}，请下载 google/siglip2-base-patch16-256"
            ))
            raise _load_error
        _load_started = True
        _load_into_globals(root)
        return _model, _processor, _device


def _fail_load(exc: Exception) -> None:
    global _load_started, _load_error
    _load_started = False
    _load_error = exc
    _ready.set()


def _load_into_globals(root: Path) -> None:
    global _model, _processor, _device, _load_error
    import torch
    import transformers  # 先整包初始化，避免多线程 import AutoModel 失败
    from transformers import AutoModel, AutoProcessor

    try:
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        logger.info(f"加载 SigLIP 2: {root} device={device}")
        processor = AutoProcessor.from_pretrained(str(root))
        model = AutoModel.from_pretrained(str(root)).to(device).eval()
        # 就绪前先跑一次，把 MPS shader 编译好（见模块说明）；成功后才写全局
        _run_text(model, processor, device, "warmup")
        _processor = processor
        _model = model
        _device = device
        _load_error = None
        logger.info("SigLIP 2 已就绪")
        _ready.set()
    except Exception as exc:
        _fail_load(exc)
        raise
    del transformers


def _as_unit_list(feats) -> List[float]:
    vec = feats.pooler_output if hasattr(feats, "pooler_output") else feats
    vec = vec.detach()
    if vec.ndim > 1:
        vec = vec.reshape(vec.shape[0], -1)[0]
    vec = vec / vec.norm(p=2)
    return vec.float().cpu().tolist()
