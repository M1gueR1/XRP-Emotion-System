from pathlib import Path
from PIL import Image


# =========================
# CONFIGURACIÓN
# =========================

EMOTION_NAME = "excited"

PROJECT_DIRECTORY = (
    Path(__file__).resolve().parent.parent
)

# Archivo fuente: el sprite sheet NUEVO que te pasó el profe
SOURCE_FILE = (
    PROJECT_DIRECTORY
    /"tools"
    /"finalEmotions"
    /"BlinkAwake.png"
)

OUTPUT_FILE = (
    PROJECT_DIRECTORY
    /"tools"
    /"finalEmotions"
    /"BlinkAwakeChanged.png"
)


# Layout del sprite sheet original
FRAME_COUNT = 66
SOURCE_FRAME_WIDTH = 320
SOURCE_FRAME_HEIGHT = 320
GRID_COLUMNS = 9

# Tamaño final para dashboard
OUTPUT_FRAME_WIDTH = 64
OUTPUT_FRAME_HEIGHT = 64


# =========================
# LÓGICA
# =========================

def main() -> None:
    if not SOURCE_FILE.is_file():
        raise FileNotFoundError(
            f"No se encontró el archivo fuente: {SOURCE_FILE}"
        )

    source = Image.open(SOURCE_FILE).convert("RGBA")

    expected_rows = (
        (FRAME_COUNT + GRID_COLUMNS - 1) // GRID_COLUMNS
    )

    expected_width = GRID_COLUMNS * SOURCE_FRAME_WIDTH
    expected_height = expected_rows * SOURCE_FRAME_HEIGHT

    if source.width < expected_width or source.height < expected_height:
        raise ValueError(
            "La imagen fuente es más pequeña de lo esperado.\n"
            f"Esperado mínimo: {expected_width}x{expected_height}\n"
            f"Actual: {source.width}x{source.height}"
        )

    output = Image.new(
        "RGBA",
        (
            FRAME_COUNT * OUTPUT_FRAME_WIDTH,
            OUTPUT_FRAME_HEIGHT,
        ),
        (0, 0, 0, 0),
    )

    for frame_index in range(FRAME_COUNT):
        row = frame_index // GRID_COLUMNS
        col = frame_index % GRID_COLUMNS

        left = col * SOURCE_FRAME_WIDTH
        upper = row * SOURCE_FRAME_HEIGHT
        right = left + SOURCE_FRAME_WIDTH
        lower = upper + SOURCE_FRAME_HEIGHT

        frame = source.crop((left, upper, right, lower))

        frame = frame.resize(
            (OUTPUT_FRAME_WIDTH, OUTPUT_FRAME_HEIGHT),
            Image.Resampling.LANCZOS,
        )

        output.paste(
            frame,
            (frame_index * OUTPUT_FRAME_WIDTH, 0),
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT_FILE)

    print(f"Emoción: {EMOTION_NAME}")
    print(f"Creado: {OUTPUT_FILE}")
    print(
        f"Spritesheet final: {output.width} x {output.height}"
    )
    print(
        f"Frames: {FRAME_COUNT}"
    )
    print(
        f"Tamaño por frame: {OUTPUT_FRAME_WIDTH} x {OUTPUT_FRAME_HEIGHT}"
    )


if __name__ == "__main__":
    main()