import {
  useEffect,
  useMemo,
  useState,
} from "react";


type EmotionSpritePreviewProps = {
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  playing?: boolean;
  maxDisplaySize?: number;
};


function EmotionSpritePreview({
  imageUrl,
  frameWidth,
  frameHeight,
  frameCount,
  fps,
  playing = true,
  maxDisplaySize = 240,
}: EmotionSpritePreviewProps) {
  const [frameIndex, setFrameIndex] =
    useState(0);

  const displayScale = useMemo(() => {
    const largestDimension = Math.max(
      frameWidth,
      frameHeight,
      1
    );

    const calculatedScale = Math.floor(
      maxDisplaySize /
        largestDimension
    );

    return Math.max(
      1,
      Math.min(
        calculatedScale,
        5
      )
    );
  }, [
    frameHeight,
    frameWidth,
    maxDisplaySize,
  ]);


  useEffect(() => {
    setFrameIndex(0);
  }, [
    imageUrl,
    frameCount,
  ]);


  useEffect(() => {
    if (
      !playing ||
      frameCount <= 1 ||
      fps <= 0
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          setFrameIndex(
            (currentFrame) =>
              (
                currentFrame + 1
              ) % frameCount
          );
        },
        1000 / fps
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [
    fps,
    frameCount,
    playing,
  ]);


  if (
    !imageUrl ||
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    frameCount <= 0
  ) {
    return (
      <div className="flex h-52 w-full items-center justify-center rounded-xl border border-dashed border-slate-400 bg-slate-100 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
        Select a PNG spritesheet
      </div>
    );
  }


  const displayWidth =
    frameWidth *
    displayScale;

  const displayHeight =
    frameHeight *
    displayScale;

  const sheetWidth =
    frameWidth *
    frameCount *
    displayScale;

  const sheetHeight =
    frameHeight *
    displayScale;

  const backgroundX =
    frameIndex *
    frameWidth *
    displayScale;


  return (
    <div className="flex min-h-52 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-black p-4">
      <div
        role="img"
        aria-label={
          `Sprite frame ${
            frameIndex + 1
          }`
        }
        style={{
          width:
            `${displayWidth}px`,

          height:
            `${displayHeight}px`,

          backgroundImage:
            `url("${imageUrl}")`,

          backgroundRepeat:
            "no-repeat",

          backgroundSize:
            `${sheetWidth}px ` +
            `${sheetHeight}px`,

          backgroundPosition:
            `-${backgroundX}px 0px`,

          imageRendering:
            "pixelated",
        }}
      />

      <div className="text-xs text-slate-300">
        Frame {frameIndex + 1} of{" "}
        {frameCount}
      </div>
    </div>
  );
}


export default EmotionSpritePreview;