from pathlib import Path

from PIL import Image


DISPLAY_WIDTH = 320
DISPLAY_HEIGHT = 240


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
    / "red_vision_assets"
)

OUTPUT_DIRECTORY = (
    PROJECT_DIRECTORY
    / "red_vision_sheets"
)


def create_sheet(
    emotion_name: str,
    frame_count: int,
) -> Path:
    sheet = Image.new(
        "RGB",
        (
            DISPLAY_WIDTH,
            DISPLAY_HEIGHT * frame_count,
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
        frame_path = (
            SOURCE_DIRECTORY
            / (
                f"{emotion_name}_"
                f"{frame_index}.png"
            )
        )

        if not frame_path.is_file():
            raise FileNotFoundError(
                f"Missing frame: {frame_path}"
            )

        with Image.open(
            frame_path
        ) as frame:
            frame = frame.convert(
                "RGB"
            )

            if frame.size != (
                DISPLAY_WIDTH,
                DISPLAY_HEIGHT,
            ):
                raise ValueError(
                    f"{frame_path.name}: expected "
                    f"{DISPLAY_WIDTH}x"
                    f"{DISPLAY_HEIGHT}, found "
                    f"{frame.width}x"
                    f"{frame.height}"
                )

            sheet.paste(
                frame,
                (
                    0,
                    frame_index
                    * DISPLAY_HEIGHT,
                ),
            )

    output_path = (
        OUTPUT_DIRECTORY
        / f"{emotion_name}.png"
    )

    sheet.save(
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

    for (
        emotion_name,
        frame_count,
    ) in EMOTIONS.items():
        output_path = create_sheet(
            emotion_name,
            frame_count,
        )

        print(
            f"Created {output_path.name}: "
            f"{DISPLAY_WIDTH}x"
            f"{DISPLAY_HEIGHT * frame_count}"
        )


if __name__ == "__main__":
    main()