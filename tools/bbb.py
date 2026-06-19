from pathlib import Path
from PIL import Image


source_path = Path(
    "red_vision_assets/happy_0.png"
)

output_path = Path(
    "red_vision_assets/happy_0.bmp"
)


with Image.open(source_path) as image:
    image.convert("RGB").save(
        output_path,
        format="BMP",
    )


print(
    "Created:",
    output_path
)