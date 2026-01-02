# 测试指南

本文档说明如何运行和编写项目的自动化测试。

## 📁 目录结构

```
backend/
├── app/                          # 业务代码
│   └── services/
│       └── metadata/
│           └── video.py
├── tests/                        # ✨ 测试代码
│   ├── conftest.py               # pytest 全局配置和 fixtures
│   ├── unit/                     # 单元测试
│   │   └── services/
│   │       └── metadata/
│   │           └── test_video_extractor.py
│   └── integration/              # 集成测试
│       └── test_scan_workflow.py
├── scripts/                      # 🔧 工具脚本（非自动化测试）
│   └── test_video_metadata.py   # 手动调试工具
└── pyproject.toml                # pytest 配置
```

---

## 🚀 快速开始

### 安装测试依赖

```bash
cd backend
pip install pytest pytest-cov pytest-mock
```

### 运行所有测试

```bash
pytest
```

---

## 📝 常用命令

### 基础命令

```bash
# 运行所有测试
pytest

# 显示详细输出
pytest -v

# 显示更详细的输出（包括打印语句）
pytest -vv -s

# 运行特定目录的测试
pytest tests/unit
pytest tests/integration

# 运行特定文件
pytest tests/unit/services/metadata/test_video_extractor.py

# 运行特定测试类
pytest tests/unit/services/metadata/test_video_extractor.py::TestVideoMetadataExtractor

# 运行特定测试函数
pytest tests/unit/services/metadata/test_video_extractor.py::TestVideoMetadataExtractor::test_parse_datetime_iso8601

# 运行名称匹配的测试（支持模糊匹配）
pytest -k "datetime"
pytest -k "test_parse"
```

### 覆盖率测试

```bash
# 显示覆盖率
pytest --cov=app

# 生成详细的覆盖率报告
pytest --cov=app --cov-report=term-missing

# 生成 HTML 覆盖率报告
pytest --cov=app --cov-report=html

# 查看 HTML 报告
open htmlcov/index.html
```

### 调试相关

```bash
# 失败时进入调试器
pytest --pdb

# 第一个失败后停止
pytest -x

# 最多运行 3 个失败后停止
pytest --maxfail=3

# 显示最慢的 10 个测试
pytest --durations=10
```

### 标记过滤

```bash
# 只运行单元测试
pytest -m unit

# 只运行集成测试
pytest -m integration

# 跳过慢速测试
pytest -m "not slow"

# 只运行需要 ffmpeg 的测试
pytest -m requires_ffmpeg
```

---

## ✍️ 编写测试

### 测试文件命名规范

- 文件名：`test_*.py` 或 `*_test.py`
- 测试类：`Test*`
- 测试函数：`test_*`

### 示例：单元测试

```python
"""test_video_extractor.py"""
import pytest
from datetime import datetime
from app.services.metadata import VideoMetadataExtractor


class TestVideoMetadataExtractor:
    """测试 VideoMetadataExtractor 类"""

    def setup_method(self):
        """每个测试前执行"""
        self.extractor = VideoMetadataExtractor()

    def test_parse_datetime_iso8601(self):
        """测试：解析 ISO 8601 格式时间"""
        result = self.extractor._parse_datetime(
            '2024-12-07T22:30:13.000000Z',
            'creation_time'
        )
        assert result == datetime(2024, 12, 7, 22, 30, 13)

    def test_parse_datetime_invalid(self):
        """测试：无效格式返回 None"""
        result = self.extractor._parse_datetime(
            'invalid-date',
            'creation_time'
        )
        assert result is None
```

### 使用 Fixtures

```python
# conftest.py
@pytest.fixture
def sample_metadata():
    return {'width': 1920, 'height': 1080}


# test_video_extractor.py
def test_with_fixture(sample_metadata):
    """使用 fixture 的测试"""
    assert sample_metadata['width'] == 1920
```

### 使用 Mock

```python
from unittest.mock import patch, MagicMock

@patch('ffmpeg.probe')
def test_extract_with_mock(mock_probe):
    """使用 mock 测试"""
    mock_probe.return_value = {'format': {'duration': '10.5'}}

    extractor = VideoMetadataExtractor()
    metadata, _ = extractor.extract('/fake/video.mov')

    mock_probe.assert_called_once_with('/fake/video.mov')
    assert metadata['duration'] == 10.5
```

---

## 🏷️ 测试标记

在测试函数上使用装饰器添加标记：

```python
import pytest

@pytest.mark.unit
def test_simple_function():
    """单元测试"""
    pass

@pytest.mark.integration
def test_api_workflow():
    """集成测试"""
    pass

@pytest.mark.slow
@pytest.mark.requires_ffmpeg
def test_large_video():
    """慢速测试，需要 ffmpeg"""
    pass
```

---

## 📊 测试类型

### 1. 单元测试 (`tests/unit/`)

测试单个函数或类的行为，不依赖外部资源。

**特点：**
- ✅ 快速执行
- ✅ 隔离性强
- ✅ 使用 mock 模拟依赖

**示例：**
```python
def test_parse_gps_coordinate():
    """测试 GPS 坐标解析逻辑"""
    extractor = VideoMetadataExtractor()
    result = extractor._parse_iso6709('+37.7749-122.4194/')

    assert result['latitude'] == 37.7749
    assert result['longitude'] == -122.4194
```

### 2. 集成测试 (`tests/integration/`)

测试多个组件协作的场景。

**特点：**
- ⏱️ 执行较慢
- 🔗 测试组件间交互
- 📦 可能依赖真实资源（数据库、文件等）

**示例：**
```python
@pytest.mark.integration
def test_scan_and_import_workflow(test_db):
    """测试完整的扫描导入流程"""
    scanner = FilesystemScanner()
    assets = scanner.scan('/test/videos/', created_by=1)

    assert len(assets) > 0
    assert assets[0]['asset_type'] == 'video'
```

---

## 🔧 工具脚本 vs 自动化测试

### 工具脚本 (`scripts/`)

**用途：** 手动调试、临时验证、演示功能

**示例：**
```bash
python scripts/test_video_metadata.py /path/to/video.mov
```

### 自动化测试 (`tests/`)

**用途：** CI/CD 集成、回归测试、质量保证

**示例：**
```bash
pytest tests/unit/services/metadata/test_video_extractor.py
```

---

## 📚 最佳实践

### 1. **测试命名要清晰**

```python
# ✅ 好的命名
def test_parse_datetime_returns_none_for_invalid_format():
    pass

# ❌ 不好的命名
def test1():
    pass
```

### 2. **每个测试只测一件事**

```python
# ✅ 好的测试
def test_parse_iso6709_with_altitude():
    result = extractor._parse_iso6709('+37.7749-122.4194+100/')
    assert result['altitude'] == 100.0

def test_parse_iso6709_without_altitude():
    result = extractor._parse_iso6709('+37.7749-122.4194/')
    assert 'altitude' not in result

# ❌ 不好的测试（测试多件事）
def test_parse_iso6709_all_cases():
    # 测试太多场景，难以定位问题
    pass
```

### 3. **使用 AAA 模式**

```python
def test_example():
    # Arrange（准备）
    extractor = VideoMetadataExtractor()
    gps_string = '+37.7749-122.4194/'

    # Act（执行）
    result = extractor._parse_iso6709(gps_string)

    # Assert（断言）
    assert result['latitude'] == 37.7749
```

### 4. **避免测试私有实现细节**

```python
# ✅ 测试公共 API
def test_extract_returns_metadata_and_datetime():
    metadata, shot_at = extractor.extract('/video.mov')
    assert isinstance(metadata, dict)
    assert isinstance(shot_at, datetime) or shot_at is None

# ⚠️ 测试私有方法（有时必要，但要谨慎）
def test_internal_helper_function():
    # 只在逻辑复杂且需要单独验证时测试私有方法
    pass
```

---

## 🎯 持续集成

在 CI/CD 管道中运行测试：

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: pytest --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 📖 参考资源

- [Pytest 官方文档](https://docs.pytest.org/)
- [Python 测试最佳实践](https://realpython.com/pytest-python-testing/)
- [Mock 对象使用指南](https://docs.python.org/3/library/unittest.mock.html)
