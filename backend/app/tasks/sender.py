"""同步上下文中的 Taskiq 协程执行器

用于在同步代码（例如线程池任务、批处理脚本）中稳定执行异步协程。

为什么需要：
- Taskiq Redis Broker 使用 asyncio 连接池复用连接
- 反复 `asyncio.run()` 会创建/关闭多个事件循环，导致连接跨 loop 复用时出现
  `RuntimeError: Event loop is closed`

策略：
- 在进程内维护一个常驻事件循环线程
- 所有发送协程统一调度到该事件循环执行，避免跨 loop 复用问题
"""

from __future__ import annotations

import asyncio
import threading
from concurrent.futures import Future
from typing import Any, Coroutine, Optional, TypeVar

_T = TypeVar("_T")


class _AsyncLoopThread:
    def __init__(self, name: str = "taskiq-sender") -> None:
        self._name = name
        self._thread: Optional[threading.Thread] = None
        self._thread_id: Optional[int] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._started = threading.Event()
        self._lock = threading.Lock()

    def ensure_started(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return

            self._started.clear()
            self._thread = threading.Thread(target=self._run, name=self._name, daemon=True)
            self._thread.start()

        if not self._started.wait(timeout=5):
            raise RuntimeError("Taskiq Sender 事件循环启动超时")

    def _run(self) -> None:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        self._loop = loop
        self._thread_id = threading.get_ident()
        self._started.set()

        loop.run_forever()
        loop.close()

    def submit(self, coro: Coroutine[Any, Any, _T]) -> Future[_T]:
        self.ensure_started()

        if self._thread_id == threading.get_ident():
            raise RuntimeError("禁止在 Sender 事件循环线程内阻塞提交协程")

        if not self._loop:
            raise RuntimeError("Taskiq Sender 事件循环未初始化")

        return asyncio.run_coroutine_threadsafe(coro, self._loop)


_sender_loop = _AsyncLoopThread()


def run_coroutine_sync(coro: Coroutine[Any, Any, _T]) -> _T:
    """在同步上下文中执行协程并返回结果。"""
    return _sender_loop.submit(coro).result()

