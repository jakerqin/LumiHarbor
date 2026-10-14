"""全局异常处理：不向客户端泄露异常详情"""
from fastapi.testclient import TestClient

from app.main import app

SECRET = "SELECT * FROM assets /secret/nas/path"


@app.get("/__test_boom__")
def _boom():
    raise RuntimeError(SECRET)


def test_unhandled_exception_hides_detail():
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/__test_boom__")

    assert resp.status_code == 500
    body = resp.json()
    assert body["code"] == "500"
    assert SECRET not in body["message"]
    assert "错误ID" in body["message"]
