from PIL import Image

from app.tools.face.image_io import load_rgb


def test_load_rgb_applies_exif_orientation(tmp_path):
    img = Image.new("RGB", (20, 10), (255, 0, 0))
    exif = img.getexif()
    exif[274] = 8
    path = tmp_path / "sideways.jpg"
    img.save(path, exif=exif)
    loaded = load_rgb(str(path))
    assert loaded.size == (10, 20)
    assert loaded.mode == "RGB"
