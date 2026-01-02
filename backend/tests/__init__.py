"""
测试套件

包含所有单元测试、集成测试和端到端测试。

运行测试:
    # 运行所有测试
    pytest

    # 运行单元测试
    pytest tests/unit

    # 运行集成测试
    pytest tests/integration

    # 运行特定测试文件
    pytest tests/unit/services/metadata/test_video_extractor.py

    # 运行特定测试函数
    pytest tests/unit/services/metadata/test_video_extractor.py::test_extract_creation_time

    # 显示详细输出
    pytest -v

    # 显示覆盖率
    pytest --cov=app
"""
