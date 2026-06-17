from pathlib import Path

from PIL import Image, ImageOps


FRAME_COUNT = 3
FRAME_WIDTH = 64
FRAME_HEIGHT = 64


PROJECT_DIRECTORY = (
    Path(__file__).resolve().parent.parent
)

SOURCE_FILE = (
    PROJECT_DIRECTORY
    /"XRP-EMOTION-SYSTEM"
    /"defaultImages"
    /"upsetDef.png"
)

OUTPUT_FILE = (
    PROJECT_DIRECTORY
    /"XRP-EMOTION-SYSTEM"
    /"defaultImages"
    /"upset.png"
)


def main() -> None:
    if not SOURCE_FILE.is_file():
        raise FileNotFoundError(
            f"Source image not found: {SOURCE_FILE}"
        )

    source = Image.open(
        SOURCE_FILE
    ).convert("RGBA")

    output = Image.new(
        "RGBA",
        (
            FRAME_WIDTH * FRAME_COUNT,
            FRAME_HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    for frame_index in range(
        FRAME_COUNT
    ):
        
        left = round(
            frame_index
            * source.width
            / FRAME_COUNT
        )

        right = round(
            (frame_index + 1)
            * source.width
            / FRAME_COUNT
        )

        frame = source.crop(
            (
                left,
                0,
                right,
                source.height,
            )
        )

        frame = ImageOps.fit(
            frame,
            (
                FRAME_WIDTH,
                FRAME_HEIGHT,
            ),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )

        output.paste(
            frame,
            (
                frame_index
                * FRAME_WIDTH,
                0,
            ),
        )

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    output.save(
        OUTPUT_FILE
    )

    print(f"Created: {OUTPUT_FILE}")
    print(
        "Spritesheet size:",
        output.width,
        "x",
        output.height,
    )

    print(
        "Frame size:",
        FRAME_WIDTH,
        "x",
        FRAME_HEIGHT,
    )


if __name__ == "__main__":
    main()