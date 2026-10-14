"""扫描任务的进程内状态：同一时间只允许一个扫描，并对外提供进度

为什么不用 Taskiq：扫描是系统初始化时的一次性操作，可重复执行（已导入的文件按哈希跳过），
进程重启丢了状态重新发起即可；放进 Worker 反而会和人脸/语义向量任务抢同一个 Worker。

限制：状态只在当前后端进程内有效（uvicorn 单进程）。
"""
import threading
from datetime import datetime
from typing import Optional

from .statistics import ImportStatistics

# 进度里最多带出的失败文件数
MAX_FAILED_FILES = 20


class ScanState:
    """扫描状态（线程安全）

    status: idle（从未扫描）/ scanning / completed / failed
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._status = "idle"
        self._path: Optional[str] = None
        self._started_at: Optional[datetime] = None
        self._finished_at: Optional[datetime] = None
        self._error: Optional[str] = None
        self._statistics: Optional[ImportStatistics] = None

    def try_start(self, path: str) -> bool:
        """占用扫描槽位；已有扫描在跑时返回 False"""
        with self._lock:
            if self._status == "scanning":
                return False
            self._status = "scanning"
            self._path = path
            self._started_at = datetime.now()
            self._finished_at = None
            self._error = None
            self._statistics = None
            return True

    def attach(self, statistics: ImportStatistics) -> None:
        """挂上导入服务的统计对象，进度随导入实时变化"""
        with self._lock:
            self._statistics = statistics

    def finish(self, error: Optional[str] = None) -> None:
        with self._lock:
            self._status = "failed" if error else "completed"
            self._error = error
            self._finished_at = datetime.now()

    def snapshot(self) -> dict:
        with self._lock:
            stats = self._statistics
            return {
                "status": self._status,
                "path": self._path,
                "started_at": self._started_at,
                "finished_at": self._finished_at,
                "error": self._error,
                # total 在目录遍历完成前为 0
                "total": stats.total if stats else 0,
                "imported": stats.imported if stats else 0,
                "skipped": stats.skipped if stats else 0,
                "failed": stats.failed if stats else 0,
                "failed_files": [
                    {"path": path, "error": err}
                    for path, err in (stats.failed_files[:MAX_FAILED_FILES] if stats else [])
                ],
            }


# 全局唯一实例
scan_state = ScanState()
