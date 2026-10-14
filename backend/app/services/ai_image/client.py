"""OpenAI Images API 封装：输入图预处理、尺寸换算、结果解码、错误转中文"""
import base64
import io
from typing import List

from PIL import Image, ImageOps

from ...config import settings
from ...tools.utils import get_logger

logger = get_logger(__name__)

# gpt-image-2 系列自定义尺寸约束：边长为 16 的倍数、宽高比 1:3 ~ 3:1、最大 3840x2160
SIZE_STEP = 16
MAX_RATIO = 3.0
# 上传前把输入图缩到这个长边以内：再大不会更清晰，只会更慢、更贵
MAX_INPUT_EDGE = 2048
# 输出长边：标准档 / 精细档
OUTPUT_EDGE = {"standard": 1536, "hq": 2048}
GENERATE_SIZES = {"square": "1024x1024", "landscape": "1536x1024", "portrait": "1024x1536"}


class AiImageError(Exception):
    """面向用户的失败原因（写进 ai_image_jobs.error_message）"""


def is_configured() -> bool:
    return bool(settings.OPENAI_API_KEY)


def quality_for(tier: str) -> str:
    return settings.AI_IMAGE_HQ_QUALITY if tier == "hq" else settings.AI_IMAGE_QUALITY


def edit_size(width: int, height: int, tier: str) -> str:
    """按原图宽高比算输出尺寸：长边固定，两边取 16 的倍数，宽高比夹到 1:3 ~ 3:1"""
    ratio = min(max(width / height, 1 / MAX_RATIO), MAX_RATIO)
    long_edge = OUTPUT_EDGE.get(tier, OUTPUT_EDGE["standard"])
    if ratio >= 1:
        w, h = long_edge, long_edge / ratio
    else:
        w, h = long_edge * ratio, long_edge
    return f"{_snap(w)}x{_snap(h)}"


def _snap(value: float) -> int:
    return max(SIZE_STEP, int(round(value / SIZE_STEP)) * SIZE_STEP)


def prepare_input(path: str) -> bytes:
    """读图（含 EXIF 方向）→ RGB → 缩到 MAX_INPUT_EDGE → PNG 字节"""
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image) or image
        image = image.convert("RGB")
        image.thumbnail((MAX_INPUT_EDGE, MAX_INPUT_EDGE), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()


def image_size(path: str) -> tuple[int, int]:
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image) or image
        return image.size


async def call_images_api(
    prompt: str,
    images: List[bytes],
    size: str,
    quality: str,
) -> bytes:
    """有输入图走 /images/edits，没有走 /images/generations；返回 PNG 字节"""
    if not is_configured():
        raise AiImageError("未配置 OPENAI_API_KEY")
    client = _client()
    try:
        if images:
            files = [(f"input_{i}.png", data, "image/png") for i, data in enumerate(images)]
            response = await client.images.edit(
                model=settings.AI_IMAGE_MODEL, image=files, prompt=prompt, size=size, quality=quality, n=1,
            )
        else:
            response = await client.images.generate(
                model=settings.AI_IMAGE_MODEL, prompt=prompt, size=size, quality=quality, n=1,
            )
    except Exception as exc:
        raise AiImageError(_describe_error(exc)) from exc
    finally:
        await client.close()
    return _decode(response)


def _client():
    from openai import AsyncOpenAI

    return AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL or None,
        timeout=settings.AI_IMAGE_TIMEOUT_SECONDS,
        max_retries=1,
    )


def _decode(response) -> bytes:
    data = getattr(response, "data", None) or []
    b64 = getattr(data[0], "b64_json", None) if data else None
    if not b64:
        raise AiImageError("模型没有返回图片")
    return base64.b64decode(b64)


def _describe_error(exc: Exception) -> str:
    """把 SDK 异常转成用户能看懂的原因；原始信息进日志"""
    import openai

    logger.warning("OpenAI 图像接口失败: %r", exc)
    code = getattr(exc, "code", None)
    if isinstance(exc, openai.BadRequestError) and code in ("moderation_blocked", "content_policy_violation"):
        return "内容被 OpenAI 安全审核拦截，换个描述或换张图试试"
    if isinstance(exc, openai.AuthenticationError):
        return "OPENAI_API_KEY 无效"
    if isinstance(exc, openai.PermissionDeniedError):
        return "当前账号无权使用该模型（可能需要组织认证）"
    if isinstance(exc, openai.RateLimitError):
        return "额度不足或请求太频繁，请稍后再试"
    if isinstance(exc, openai.APITimeoutError):
        return "调用超时，请稍后再试"
    if isinstance(exc, openai.APIConnectionError):
        return "连不上 OpenAI 服务，请检查网络或 OPENAI_BASE_URL"
    if isinstance(exc, openai.BadRequestError):
        return f"请求被拒绝：{getattr(exc, 'message', exc)}"
    return "图像模型调用失败，请稍后再试"
