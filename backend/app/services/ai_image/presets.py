"""AI 修图 / 生图预设

提示词写法参考 awesome-gpt-image-2 的「结构化提示词」：目标 → 必须保持不变的部分 → 约束。
修图类统一追加 KEEP_IDENTITY，避免模型改掉人物身份、构图——家庭照片里「人还是那个人」比好看更重要。
提示词用英文（模型对英文指令遵循更稳），名称和说明给界面用中文。
"""
from dataclasses import dataclass
from typing import Dict, List, Optional

KEEP_IDENTITY = (
    "Keep every person's identity, facial features, age, expression and body shape exactly the same. "
    "Keep the original composition, camera angle and framing. Do not add text, watermarks or borders."
)


@dataclass(frozen=True)
class Preset:
    code: str
    name: str
    description: str
    prompt: str
    # 需要用户补充描述（如「去掉哪里的路人」）
    needs_input: bool = False
    # 推荐「精细」档（细节要求高的修复类）
    hq: bool = False


EDIT_PRESETS: List[Preset] = [
    Preset("restore_old_photo", "老照片修复", "去划痕、污渍和折痕，修复褪色，提升清晰度",
           "Restore this old photograph: remove scratches, dust, stains and creases, repair faded areas, "
           "reduce noise and gently improve sharpness while keeping a natural photographic look.", hq=True),
    Preset("enhance", "画质增强", "降噪、提亮暗部、增强细节，像用更好的相机重拍",
           "Enhance this photo as if shot with a better camera: reduce noise, recover shadow and highlight detail, "
           "improve sharpness and natural color balance. Keep it realistic, no stylization."),
    Preset("colorize", "黑白上色", "给黑白或泛黄照片上自然的颜色",
           "Colorize this black-and-white or sepia photograph with natural, historically plausible colors "
           "and realistic skin tones.", hq=True),
    Preset("remove_objects", "消除路人杂物", "描述要去掉的东西，例如「左边的路人和垃圾桶」",
           "Remove the following from the photo and fill the area naturally so it looks untouched: {input}.",
           needs_input=True),
    Preset("blur_background", "背景虚化", "像大光圈人像一样虚化背景，突出主体",
           "Apply a natural shallow depth-of-field effect: keep the main subject sharp and softly blur the "
           "background like a wide-aperture portrait lens."),
    Preset("plain_background", "换纯色背景", "填写背景颜色，例如「白色」「浅蓝色」，适合证件照、头像",
           "Replace the background with a clean, evenly lit solid {input} background. Keep the subject's edges "
           "and hair natural.", needs_input=True),
    Preset("sunny_sky", "阴天变晴天", "把灰蒙蒙的天空换成晴朗的蓝天，光线随之调整",
           "Change the overcast sky into a clear blue sky with a few soft clouds and adjust the scene lighting "
           "to match natural sunlight."),
    Preset("film_look", "胶片色调", "温暖柔和的胶片质感",
           "Give this photo a warm analog film look: soft contrast, gentle grain and slightly faded, warm tones."),
    Preset("anime", "动漫风格", "转成日系动画风格插画",
           "Redraw this photo as a high-quality Japanese anime illustration with clean line art and soft cel "
           "shading, keeping the same scene and people recognizable."),
    Preset("watercolor", "水彩风格", "转成柔和的水彩画",
           "Repaint this photo as a soft watercolor painting with visible paper texture and gentle color bleeds, "
           "keeping the same scene and people recognizable."),
]

GENERATE_PRESETS: List[Preset] = [
    Preset("greeting_card", "节日贺卡", "描述节日和想要的画面，例如「中秋节，一家人赏月」",
           "Design a warm festive greeting card illustration: {input}. Cozy atmosphere, harmonious colors, "
           "leave clean space at the top for a short greeting.", needs_input=True),
    Preset("album_cover", "相册封面", "描述相册主题，例如「2024 春节旅行，江南水乡」",
           "Create an elegant photo album cover image for the theme: {input}. Cinematic lighting, "
           "magazine-quality composition, no text.", needs_input=True),
    Preset("note_illustration", "笔记配图", "描述笔记内容，生成一张配图",
           "Create a clean editorial illustration for a personal journal entry about: {input}. "
           "Soft colors, simple composition, no text.", needs_input=True),
    Preset("hand_drawn", "手绘插画", "描述画面，生成温暖的手绘风插画",
           "A warm hand-drawn picture-book illustration of: {input}. Gentle colored-pencil texture, "
           "soft light, no text.", needs_input=True),
]

_BY_CODE: Dict[str, Preset] = {p.code: p for p in EDIT_PRESETS + GENERATE_PRESETS}
EDIT_CODES = {p.code for p in EDIT_PRESETS}
GENERATE_CODES = {p.code for p in GENERATE_PRESETS}


def get_preset(code: Optional[str]) -> Optional[Preset]:
    return _BY_CODE.get(code) if code else None


def build_prompt(job_type: str, preset_code: Optional[str], user_text: Optional[str]) -> str:
    """组装最终提示词；预设缺必填描述、或既无预设也无描述时抛 ValueError"""
    text = (user_text or "").strip()
    preset = get_preset(preset_code)
    if preset_code and not preset:
        raise ValueError(f"未知预设: {preset_code}")
    if preset and preset.code not in (EDIT_CODES if job_type == "edit" else GENERATE_CODES):
        raise ValueError(f"预设 {preset.name} 不能用于{'修图' if job_type == 'edit' else '生图'}")
    if preset and preset.needs_input and not text:
        raise ValueError(f"「{preset.name}」需要补充描述")
    if not preset and not text:
        raise ValueError("请选择预设或填写描述")

    if preset:
        body = preset.prompt.format(input=text) if preset.needs_input else preset.prompt
        if text and not preset.needs_input:
            body += f" Additional request: {text}"
    else:
        body = text
    return f"{body} {KEEP_IDENTITY}" if job_type == "edit" else body
