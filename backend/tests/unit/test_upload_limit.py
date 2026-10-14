"""上传：请求体大小限制 + 接口不阻塞事件循环"""
import inspect

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.middleware import UploadSizeLimitMiddleware
from app.routers.ingestion import upload


def _client(max_bytes: int) -> TestClient:
    app = FastAPI()

    @app.post("/ingestion/upload")
    def _upload():
        return {"ok": True}

    @app.post("/notes")
    def _notes():
        return {"ok": True}

    # 与 main.py 相同的注册顺序：限制先注册（内层），CORS 后注册（外层）
    app.add_middleware(UploadSizeLimitMiddleware, path_prefix="/ingestion/upload", max_bytes=max_bytes)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
    return TestClient(app)


def test_oversized_upload_rejected_with_cors_header():
    resp = _client(10).post("/ingestion/upload", content=b"x" * 100, headers={"Origin": "http://localhost:3000"})
    assert resp.status_code == 413
    assert resp.json()["code"] == "413"
    # 没有跨域头的话浏览器只会报 CORS 错误，看不到 413
    assert resp.headers.get("access-control-allow-origin") == "*"


def test_upload_within_limit_passes():
    assert _client(1000).post("/ingestion/upload", content=b"x" * 100).status_code == 200


def test_other_paths_not_limited():
    assert _client(10).post("/notes", content=b"x" * 100).status_code == 200


def test_upload_endpoints_are_sync():
    """同步 def 才会进线程池；async def 里跑导入会卡住整个事件循环"""
    assert not inspect.iscoroutinefunction(upload.upload_single_asset)
    assert not inspect.iscoroutinefunction(upload.upload_batch_assets)
