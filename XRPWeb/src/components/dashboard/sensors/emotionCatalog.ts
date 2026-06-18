import {
  OFFICIAL_EMOTIONS,
  type OfficialEmotionName,
  type OfficialEmotionRepeatMode,
} from "../emotions/officialEmotionCatalog";


export type EmotionName =
  OfficialEmotionName;


export interface EmotionVisualConfig {
  id: number;
  name: EmotionName;
  label: string;

  imagePath: string;

  frameWidth: number;
  frameHeight: number;
  frameCount: number;

  fps: number;

  repeatMode:
    OfficialEmotionRepeatMode;

  repeatModeId: number;
  repeatCount: number;
}


const REPEAT_MODE_IDS:
  Record<
    OfficialEmotionRepeatMode,
    number
  > = {
    once: 1,
    loop: 2,
    count: 3,
    ping_pong: 4,
  };


export const EMOTION_NAMES =
  OFFICIAL_EMOTIONS.map(
    (emotion) =>
      emotion.uniqueName
  ) as EmotionName[];


export const EMOTION_ID_BY_NAME =
  Object.fromEntries(
    OFFICIAL_EMOTIONS.map(
      (emotion) => [
        emotion.uniqueName,
        emotion.id,
      ]
    )
  ) as Record<
    EmotionName,
    number
  >;


export const EMOTION_BY_ID =
  Object.fromEntries(
    OFFICIAL_EMOTIONS.map(
      (emotion) => [
        emotion.id,
        {
          id: emotion.id,
          name: emotion.uniqueName,
          label: emotion.displayName,

          imagePath:
            emotion.imagePath,

          frameWidth:
            emotion.frameWidth,

          frameHeight:
            emotion.frameHeight,

          frameCount:
            emotion.frameCount,

          fps:
            emotion.defaultFps,

          repeatMode:
            emotion.repeatMode,

          repeatModeId:
            REPEAT_MODE_IDS[
              emotion.repeatMode
            ],

          repeatCount:
            emotion.repeatCount ?? -1,
        },
      ]
    )
  ) as Record<
    number,
    EmotionVisualConfig
  >;


export function getEmotionById(
  emotionId: number
): EmotionVisualConfig {
  return (
    EMOTION_BY_ID[emotionId] ??
    EMOTION_BY_ID[0]!
  );
}