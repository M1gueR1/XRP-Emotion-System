export type CustomEmotionSourceMode =
  | "single_image"
  | "horizontal_spritesheet"
  | "grid_spritesheet";

export type CustomEmotionFitMode =
  | "contain"
  | "cover";

export type CustomEmotionTargetFrameSize =
  | 64
  | 128
  | 192;

export interface ProcessCustomEmotionImageOptions {
  file: File;
  frameCount: number;
  sourceMode: CustomEmotionSourceMode;

  /*
   * Used only when sourceMode === "grid_spritesheet".
   * Example:
   * 13 rows, 5 columns, 63 total frames.
   */
  gridRows?: number;
  gridColumns?: number;

  targetFrameSize?: CustomEmotionTargetFrameSize;
  fitMode?: CustomEmotionFitMode;
  background?: "transparent" | "black";
}

export interface ProcessedCustomEmotionImage {
  spriteBlob: Blob;
  frameCount: number;
  frameWidth: CustomEmotionTargetFrameSize;
  frameHeight: CustomEmotionTargetFrameSize;
  width: number;
  height: CustomEmotionTargetFrameSize;
}

export const CUSTOM_EMOTION_FRAME_SIZE_OPTIONS:
  CustomEmotionTargetFrameSize[] =
    [
      64,
      128,
      192,
    ];

const DEFAULT_TARGET_FRAME_SIZE = 64;

const MIN_FRAMES = 1;
const MAX_FRAMES = 1024;

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 1024;

function normalizeTargetFrameSize(
  value:
    | number
    | undefined
): CustomEmotionTargetFrameSize {
  if (value === 128) {
    return 128;
  }

  if (value === 192) {
    return 192;
  }

  return DEFAULT_TARGET_FRAME_SIZE;
}

function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const rounded =
    Math.round(value);

  return Math.min(
    maximum,
    Math.max(
      minimum,
      rounded
    )
  );
}

function clampFrameCount(
  value: number
): number {
  return clampInteger(
    value,
    MIN_FRAMES,
    MAX_FRAMES,
    MIN_FRAMES
  );
}

function loadImageFromFile(
  file: File
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error(
            "Could not load image. Try PNG, JPG, JPEG or WebP."
          )
        );
      };

      image.src = url;
    }
  );
}

function canvasToPngBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Could not convert image to PNG."
              )
            );

            return;
          }

          resolve(blob);
        },
        "image/png"
      );
    }
  );
}

function computeDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  targetFrameSize: CustomEmotionTargetFrameSize,
  fitMode: CustomEmotionFitMode
) {
  const scale =
    fitMode === "cover"
      ? Math.max(
          targetFrameSize /
            sourceWidth,
          targetFrameSize /
            sourceHeight
        )
      : Math.min(
          targetFrameSize /
            sourceWidth,
          targetFrameSize /
            sourceHeight
        );

  const drawWidth =
    sourceWidth * scale;

  const drawHeight =
    sourceHeight * scale;

  const dx =
    (targetFrameSize -
      drawWidth) /
    2;

  const dy =
    (targetFrameSize -
      drawHeight) /
    2;

  return {
    dx,
    dy,
    drawWidth,
    drawHeight,
  };
}

export async function
processCustomEmotionImage(
  options: ProcessCustomEmotionImageOptions
): Promise<ProcessedCustomEmotionImage> {
  const frameCount =
    clampFrameCount(
      options.frameCount
    );

  const targetFrameSize =
    normalizeTargetFrameSize(
      options.targetFrameSize
    );

  const sourceMode =
    options.sourceMode;

  const fitMode =
    options.fitMode ?? "contain";

  const background =
    options.background ??
    "transparent";

  const image =
    await loadImageFromFile(
      options.file
    );

  const naturalWidth =
    image.naturalWidth ||
    image.width;

  const naturalHeight =
    image.naturalHeight ||
    image.height;

  let gridRows = 1;
  let gridColumns = 1;

  if (
    sourceMode ===
    "horizontal_spritesheet"
  ) {
    gridRows = 1;
    gridColumns = frameCount;
  } else if (
    sourceMode ===
    "grid_spritesheet"
  ) {
    gridRows =
      clampInteger(
        options.gridRows ?? 1,
        MIN_GRID_SIZE,
        MAX_GRID_SIZE,
        1
      );

    gridColumns =
      clampInteger(
        options.gridColumns ?? frameCount,
        MIN_GRID_SIZE,
        MAX_GRID_SIZE,
        frameCount
      );

    if (
      gridRows *
        gridColumns <
      frameCount
    ) {
      throw new Error(
        "Grid rows × columns must be greater than or equal to the total frame count."
      );
    }
  }

  const sourceFrameWidth =
    sourceMode === "single_image"
      ? naturalWidth
      : naturalWidth / gridColumns;

  const sourceFrameHeight =
    sourceMode === "single_image"
      ? naturalHeight
      : naturalHeight / gridRows;

  if (
    sourceFrameWidth <= 0 ||
    sourceFrameHeight <= 0
  ) {
    throw new Error(
      "Invalid source frame size."
    );
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  /*
   * Final dashboard sprite format:
   * one horizontal row.
   *
   * The preview/dashboard already expect this shape.
   */
  canvas.width =
    targetFrameSize *
    frameCount;

  canvas.height =
    targetFrameSize;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  context.imageSmoothingEnabled =
    false;

  if (background === "black") {
    context.fillStyle = "#000000";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  } else {
    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  for (
    let frameIndex = 0;
    frameIndex < frameCount;
    frameIndex += 1
  ) {
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth =
      naturalWidth;

    let sourceHeight =
      naturalHeight;

    if (
      sourceMode !==
      "single_image"
    ) {
      const row =
        Math.floor(
          frameIndex / gridColumns
        );

      const column =
        frameIndex %
        gridColumns;

      sourceX =
        column *
        sourceFrameWidth;

      sourceY =
        row *
        sourceFrameHeight;

      sourceWidth =
        sourceFrameWidth;

      sourceHeight =
        sourceFrameHeight;
    }

    const {
      dx,
      dy,
      drawWidth,
      drawHeight,
    } = computeDrawRect(
      sourceWidth,
      sourceHeight,
      targetFrameSize,
      fitMode
    );

    const frameOutputX =
      frameIndex *
      targetFrameSize;

    context.save();

    context.beginPath();

    context.rect(
      frameOutputX,
      0,
      targetFrameSize,
      targetFrameSize
    );

    context.clip();

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      frameOutputX + dx,
      dy,
      drawWidth,
      drawHeight
    );

    context.restore();
  }

  const spriteBlob =
    await canvasToPngBlob(
      canvas
    );

  return {
    spriteBlob,
    frameCount,

    frameWidth:
      targetFrameSize,

    frameHeight:
      targetFrameSize,

    width:
      targetFrameSize *
      frameCount,

    height:
      targetFrameSize,
  };
}