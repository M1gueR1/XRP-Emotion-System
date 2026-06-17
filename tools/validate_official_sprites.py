from pathlib import Path

from PIL import Image


FRAME_SIZE = 64

EXPECTED_FRAMES = {
    "idle": 5,
    "happy": 4,
    "chuckled": 3,
    "excited": 4,
    "celebration": 4,
    "amazed": 3,
    "puzzled": 4,
    "frustrated": 3,
    "upset": 3,
    "sad": 3,
    "angry": 4,
    "love_it": 2,
    "in_love": 3,
    "delighted": 2,
    "ready_to_race": 2,
}


PROJECT_DIRECTORY = (
    Path(__file__).resolve().parent.parent
)

SPRITES_DIRECTORY = (
    PROJECT_DIRECTORY
    / "XRPWeb"
    / "public"
    / "emotions"
    / "official"
)


def main() -> None:
    errors = []

    for emotion_name, frame_count in EXPECTED_FRAMES.items():
        image_path = (
            SPRITES_DIRECTORY
            / f"{emotion_name}.png"
        )

        expected_size = (
            frame_count * FRAME_SIZE,
            FRAME_SIZE,
        )

        if not image_path.is_file():
            errors.append(
                f"Missing: {image_path}"
            )
            continue

        with Image.open(image_path) as image:
            actual_size = image.size

        if actual_size != expected_size:
            errors.append(
                f"{emotion_name}: expected "
                f"{expected_size[0]}x{expected_size[1]}, "
                f"found {actual_size[0]}x{actual_size[1]}"
            )
        else:
            print(
                f"OK: {emotion_name} "
                f"({actual_size[0]}x{actual_size[1]})"
            )

    if errors:
        print("\nValidation errors:")

        for error in errors:
            print(f"- {error}")

        raise SystemExit(1)

    print("\nAll official sprites are valid.")


if __name__ == "__main__":
    main()