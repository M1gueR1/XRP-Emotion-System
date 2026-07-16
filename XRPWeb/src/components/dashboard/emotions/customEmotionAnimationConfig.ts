import type { CustomEmotionSourceMode } from "./customEmotionImageProcessor";
import type { CustomEmotionRepeatMode } from "./customEmotionTypes";

export type CustomEmotionAnimationConfiguration = {
  sourceMode: CustomEmotionSourceMode;
  frameCount: number;
  repeatMode: CustomEmotionRepeatMode;
  repeatCount: number;
};

function positiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.round(value));
}

export function normalizeCustomEmotionAnimationConfiguration(
  configuration: CustomEmotionAnimationConfiguration,
): CustomEmotionAnimationConfiguration {
  if (configuration.sourceMode === "single_image") {
    return {
      ...configuration,
      frameCount: 1,
      repeatMode: "once",
      repeatCount: 1,
    };
  }

  return {
    ...configuration,
    frameCount: positiveInteger(configuration.frameCount, 1),
    repeatCount:
      configuration.repeatMode === "count"
        ? positiveInteger(configuration.repeatCount, 1)
        : 1,
  };
}

