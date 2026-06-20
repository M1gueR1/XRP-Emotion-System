from pathlib import Path

from PIL import Image


FRAME_SIZE = 64


EMOTIONS = {
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

SOURCE_DIRECTORY = (
    PROJECT_DIRECTORY
    / "XRPWeb"
    / "public"
    / "emotions"
    / "official"
)

OUTPUT_DIRECTORY = (
    PROJECT_DIRECTORY
    / "red_vision_sheets_64"
)


def build_sheet(
    emotion_name: str,
    frame_count: int,
) -> Path:
    source_path = (
        SOURCE_DIRECTORY
        / f"{emotion_name}.png"
    )

    if not source_path.is_file():
        raise FileNotFoundError(
            f"Missing spritesheet: {source_path}"
        )

    with Image.open(source_path) as image:
        spritesheet = image.convert("RGB")

    expected_size = (
        FRAME_SIZE * frame_count,
        FRAME_SIZE,
    )

    if spritesheet.size != expected_size:
        raise ValueError(
            f"{emotion_name}: expected "
            f"{expected_size[0]}x{expected_size[1]}, "
            f"found {spritesheet.width}x"
            f"{spritesheet.height}"
        )

    vertical_sheet = Image.new(
        "RGB",
        (
            FRAME_SIZE,
            FRAME_SIZE * frame_count,
        ),
        (
            0,
            0,
            0,
        ),
    )

    for frame_index in range(
        frame_count
    ):
        source_x = (
            frame_index * FRAME_SIZE
        )

        frame = spritesheet.crop(
            (
                source_x,
                0,
                source_x + FRAME_SIZE,
                FRAME_SIZE,
            )
        )

        vertical_sheet.paste(
            frame,
            (
                0,
                frame_index * FRAME_SIZE,
            ),
        )

    output_path = (
        OUTPUT_DIRECTORY
        / f"{emotion_name}.png"
    )

    vertical_sheet.save(
        output_path,
        format="PNG",
        optimize=False,
        compress_level=1,
    )

    return output_path


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    created_files = []

    for emotion_name, frame_count in (
        EMOTIONS.items()
    ):
        output_path = build_sheet(
            emotion_name,
            frame_count,
        )

        created_files.append(
            output_path
        )

        print(
            f"Created {output_path.name}: "
            f"{FRAME_SIZE}x"
            f"{FRAME_SIZE * frame_count}"
        )

    total_bytes = sum(
        path.stat().st_size
        for path in created_files
    )

    print()
    print(
        "Created sheets:",
        len(created_files),
    )

    print(
        "Total compressed size:",
        round(
            total_bytes / 1024,
            2,
        ),
        "KB",
    )

    print(
        "Output directory:",
        OUTPUT_DIRECTORY,
    )


if __name__ == "__main__":
    main()
