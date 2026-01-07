"""导入统计结果"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class ImportStatistics:
    """素材导入统计结果

    记录导入过程中的统计信息，提供友好的日志输出。
    """

    # 统计计数器
    total: int = 0  # 扫描到的文件总数
    imported: int = 0  # 成功导入数
    skipped: int = 0  # 跳过数（去重）
    failed: int = 0  # 失败数

    # 失败记录
    failed_files: List[tuple] = field(default_factory=list)  # [(路径, 错误信息)]

    def record_success(self):
        """记录成功导入"""
        self.imported += 1

    def record_skip(self):
        """记录跳过（去重）"""
        self.skipped += 1

    def record_failure(self, file_path: str, error: str):
        """记录失败

        Args:
            file_path: 文件路径
            error: 错误信息
        """
        self.failed += 1
        self.failed_files.append((file_path, error))

    def get_summary(self) -> str:
        """获取统计摘要"""
        return (
            f"导入完成 - "
            f"总数: {self.total}, "
            f"成功: {self.imported}, "
            f"跳过: {self.skipped}, "
            f"失败: {self.failed}"
        )

    def has_failures(self) -> bool:
        """是否有失败记录"""
        return self.failed > 0
