"""ASGI 中间件"""
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from . import schema


class UploadSizeLimitMiddleware:
    """按 Content-Length 拒绝过大的上传请求（413）

    为什么不在接口里校验：Starlette 解析 multipart 时会先把整个文件落到临时目录，
    进到接口函数时磁盘已经写过一遍。这里在读 body 之前就拦下。
    浏览器发 FormData 一定带 Content-Length；不带的（chunked）放行。
    """

    def __init__(self, app: ASGIApp, path_prefix: str, max_bytes: int) -> None:
        self.app = app
        self.path_prefix = path_prefix
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self._too_large(scope):
            max_mb = self.max_bytes // (1024 * 1024)
            response = JSONResponse(
                status_code=413,
                content=schema.ApiResponse.error(
                    code="413",
                    message=f"上传内容过大，单次请求上限 {max_mb}MB"
                ).model_dump()
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)

    def _too_large(self, scope: Scope) -> bool:
        if scope["type"] != "http" or not scope["path"].startswith(self.path_prefix):
            return False
        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    return int(value) > self.max_bytes
                except ValueError:
                    return False
        return False
