from pathlib import Path
from PIL import Image


FRAME_WIDTH = 64
FRAME_HEIGHT = 64

DISPLAY_WIDTH = 320
DISPLAY_HEIGHT = 240

FACE_SCALE = 3

FACE_WIDTH = (
    FRAME_WIDTH * FACE_SCALE
)

FACE_HEIGHT = (
    FRAME_HEIGHT * FACE_SCALE
)


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
    / "red_vision_assets"
)


try:
    NEAREST = (
        Image.Resampling.NEAREST
    )
except AttributeError:
    NEAREST = Image.NEAREST


def prepare_emotion(
    emotion_name: str,
    frame_count: int,
) -> list[Path]:
    source_path = (
        SOURCE_DIRECTORY
        / f"{emotion_name}.png"
    )

    if not source_path.is_file():
        raise FileNotFoundError(
            f"Missing spritesheet: "
            f"{source_path}"
        )

    spritesheet = Image.open(
        source_path
    ).convert("RGBA")

    expected_width = (
        FRAME_WIDTH * frame_count
    )

    expected_height = (
        FRAME_HEIGHT
    )

    if spritesheet.size != (
        expected_width,
        expected_height,
    ):
        raise ValueError(
            f"{emotion_name}: expected "
            f"{expected_width}x"
            f"{expected_height}, found "
            f"{spritesheet.width}x"
            f"{spritesheet.height}"
        )

    output_files = []

    offset_x = (
        DISPLAY_WIDTH - FACE_WIDTH
    ) // 2

    offset_y = (
        DISPLAY_HEIGHT - FACE_HEIGHT
    ) // 2

    for frame_index in range(
        frame_count
    ):
        left = (
            frame_index *
            FRAME_WIDTH
        )

        frame = spritesheet.crop(
            (
                left,
                0,
                left + FRAME_WIDTH,
                FRAME_HEIGHT,
            )
        )

        frame = frame.resize(
            (
                FACE_WIDTH,
                FACE_HEIGHT,
            ),
            resample=NEAREST,
        )

        canvas = Image.new(
            "RGBA",
            (
                DISPLAY_WIDTH,
                DISPLAY_HEIGHT,
            ),
            (
                0,
                0,
                0,
                255,
            ),
        )

        canvas.alpha_composite(
            frame,
            (
                offset_x,
                offset_y,
            ),
        )

        output_path = (
            OUTPUT_DIRECTORY
            / (
                f"{emotion_name}_"
                f"{frame_index}.png"
            )
        )

        safe_image = Image.new(
    "RGB",
    (
        DISPLAY_WIDTH,
        DISPLAY_HEIGHT,
    ),
    (
        0,
        0,
        0,
    ),
)

        safe_image.paste(
            canvas.convert("RGB"),
            (
                0,
                0,
            ),
        )

        safe_image.save(
            output_path,
            format="PNG",
            optimize=False,
            compress_level=1,
        )

        output_files.append(
            output_path
        )

    return output_files


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    for old_file in (
        OUTPUT_DIRECTORY.glob(
            "*.png"
        )
    ):
        old_file.unlink()

    created_files = []

    for (
        emotion_name,
        frame_count,
    ) in EMOTIONS.items():
        files = prepare_emotion(
            emotion_name,
            frame_count,
        )

        created_files.extend(
            files
        )

        print(
            f"Created {emotion_name}: "
            f"{len(files)} frames"
        )

    total_bytes = sum(
        file.stat().st_size
        for file in created_files
    )

    print()
    print(
        "Total frames:",
        len(created_files),
    )

    print(
        "Total size:",
        round(
            total_bytes /
            1024 /
            1024,
            2,
        ),
        "MB",
    )

    print(
        "Output:",
        OUTPUT_DIRECTORY,
    )


if __name__ == "__main__":
    main()