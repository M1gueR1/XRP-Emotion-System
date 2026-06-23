export type CustomEmotionSourceMode =
  | "single_image"
  | "horizontal_spritesheet";

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
const MAX_FRAMES = 16;

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

function clampFrameCount(
  value: number
): number {
  if (
    !Number.isFinite(value) ||
    value < MIN_FRAMES
  ) {
    return MIN_FRAMES;
  }

  if (value > MAX_FRAMES) {
    return MAX_FRAMES;
  }

  return Math.round(value);
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

  const canvas =
    document.createElement(
      "canvas"
    );

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

  /*
   * Keep pixel-art assets sharp when they are
   * resized. Normal photos still work; they are
   * just downsampled with nearest-neighbor so the
   * output remains consistent with the robot-face
   * sprite style.
   */
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

  const naturalWidth =
    image.naturalWidth ||
    image.width;

  const naturalHeight =
    image.naturalHeight ||
    image.height;

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
      sourceMode ===
      "horizontal_spritesheet"
    ) {
      sourceWidth =
        naturalWidth /
        frameCount;

      sourceX =
        frameIndex *
        sourceWidth;
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
