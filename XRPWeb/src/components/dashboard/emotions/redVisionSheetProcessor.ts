import type {
  CustomEmotionRecord,
  CustomEmotionRepeatMode,
} from "./customEmotionTypes";

export const RED_VISION_FRAME_SIZE = 192;

/*
 * For the first Red Vision demo, keep custom
 * uploads static and lightweight:
 *
 * dashboard custom emotion -> any size / any frames
 * Red Vision custom upload -> one selected frame, 192x192
 *
 * This is much safer for XRP memory and display latency.
 */
const RED_VISION_UPLOAD_FRAME_COUNT = 1;

export interface CreateRedVisionSheetOptions {
  /*
   * Zero-based dashboard frame index.
   * Example: frameIndex 4 means "frame 5" in the UI.
   */
  frameIndex?: number;
}

export interface RedVisionSheetResult {
  emotionName: string;
  fileName: string;
  sheetBlob: Blob;

  frameWidth: typeof RED_VISION_FRAME_SIZE;
  frameHeight: typeof RED_VISION_FRAME_SIZE;
  frameCount: typeof RED_VISION_UPLOAD_FRAME_COUNT;

  width: typeof RED_VISION_FRAME_SIZE;
  height: typeof RED_VISION_FRAME_SIZE;

  defaultFps: number;
  repeatMode: CustomEmotionRepeatMode;
  repeatCount: number | null;

  /*
   * Zero-based frame index selected from the dashboard sprite.
   */
  selectedFrameIndex: number;
}

function loadImageFromBlob(
  blob: Blob
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(blob);

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
            "Could not load the custom emotion sprite."
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
                "Could not convert Red Vision sheet to PNG."
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

function computeContainRect(
  sourceWidth: number,
  sourceHeight: number
) {
  const scale = Math.min(
    RED_VISION_FRAME_SIZE / sourceWidth,
    RED_VISION_FRAME_SIZE / sourceHeight
  );

  const drawWidth =
    sourceWidth * scale;

  const drawHeight =
    sourceHeight * scale;

  const dx =
    (
      RED_VISION_FRAME_SIZE -
      drawWidth
    ) / 2;

  const dy =
    (
      RED_VISION_FRAME_SIZE -
      drawHeight
    ) / 2;

  return {
    dx,
    dy,
    drawWidth,
    drawHeight,
  };
}

function validateCustomEmotionForRedVision(
  emotion: CustomEmotionRecord
): void {
  if (
    !emotion.uniqueName ||
    !/^[a-z][a-z0-9_]{0,31}$/.test(
      emotion.uniqueName
    )
  ) {
    throw new Error(
      "Invalid custom emotion name for Red Vision upload."
    );
  }

  if (emotion.frameCount < 1) {
    throw new Error(
      "The custom emotion must have at least one frame."
    );
  }

  if (
    emotion.frameWidth <= 0 ||
    emotion.frameHeight <= 0
  ) {
    throw new Error(
      "Invalid custom emotion frame size."
    );
  }
}

function normalizeFrameIndex(
  emotion: CustomEmotionRecord,
  value: number | undefined
): number {
  if (value === undefined) {
    return 0;
  }

  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      "Red Vision frame index must be an integer."
    );
  }

  if (
    value < 0 ||
    value >= emotion.frameCount
  ) {
    throw new Error(
      `Red Vision frame index must be between 0 and ${emotion.frameCount - 1}.`
    );
  }

  return value;
}

/*
 * Converts any dashboard custom emotion sprite into
 * the physical Red Vision demo format:
 *
 * /emotion_sheets_custom/<emotion_name>.png
 *
 * For this demo, the output is always exactly:
 *
 * 192 x 192
 * 1 frame
 *
 * It uses the selected frame from the dashboard sprite.
 * Dashboard sprites are processed into one horizontal row,
 * so frame N starts at x = N * frameWidth.
 *
 * This function only creates the Blob in the browser.
 * It does not upload anything to the XRP by itself.
 */
export async function createRedVisionSheetFromCustomEmotion(
  emotion: CustomEmotionRecord,
  options: CreateRedVisionSheetOptions = {}
): Promise<RedVisionSheetResult> {
  validateCustomEmotionForRedVision(
    emotion
  );

  const selectedFrameIndex =
    normalizeFrameIndex(
      emotion,
      options.frameIndex
    );

  const sourceImage =
    await loadImageFromBlob(
      emotion.spriteBlob
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = RED_VISION_FRAME_SIZE;
  canvas.height = RED_VISION_FRAME_SIZE;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Could not create Red Vision sheet canvas."
    );
  }

  context.imageSmoothingEnabled = false;

  context.fillStyle = "#000000";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const sourceX =
    selectedFrameIndex *
    emotion.frameWidth;

  const sourceY = 0;

  if (
    sourceX + emotion.frameWidth >
      (sourceImage.naturalWidth || sourceImage.width) ||
    emotion.frameHeight >
      (sourceImage.naturalHeight || sourceImage.height)
  ) {
    throw new Error(
      "The selected frame is outside the custom emotion sprite image."
    );
  }

  const {
    dx,
    dy,
    drawWidth,
    drawHeight,
  } = computeContainRect(
    emotion.frameWidth,
    emotion.frameHeight
  );

  context.drawImage(
    sourceImage,
    sourceX,
    sourceY,
    emotion.frameWidth,
    emotion.frameHeight,
    dx,
    dy,
    drawWidth,
    drawHeight
  );

  const sheetBlob =
    await canvasToPngBlob(
      canvas
    );

  return {
    emotionName: emotion.uniqueName,
    fileName: `${emotion.uniqueName}.png`,
    sheetBlob,

    frameWidth: RED_VISION_FRAME_SIZE,
    frameHeight: RED_VISION_FRAME_SIZE,
    frameCount: RED_VISION_UPLOAD_FRAME_COUNT,

    width: RED_VISION_FRAME_SIZE,
    height: RED_VISION_FRAME_SIZE,

    defaultFps: emotion.defaultFps,

    /*
     * With one frame, repeat mode does not visually
     * matter. Keep the stored value for consistency.
     */
    repeatMode: emotion.repeatMode,
    repeatCount: null,

    selectedFrameIndex,
  };
}

/*
 * Helper for testing.
 */
export async function downloadRedVisionSheetForTesting(
  emotion: CustomEmotionRecord,
  options: CreateRedVisionSheetOptions = {}
): Promise<void> {
  const result =
    await createRedVisionSheetFromCustomEmotion(
      emotion,
      options
    );

  const url =
    URL.createObjectURL(
      result.sheetBlob
    );

  try {
    const link =
      document.createElement("a");

    link.href = url;
    link.download = result.fileName;

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
