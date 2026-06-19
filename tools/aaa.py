from PIL import Image

image = Image.open(
    "red_vision_assets/happy_0.png"
)

print("Mode:", image.mode)
print("Size:", image.size)
print("Format:", image.format)
print("Info:", image.info)