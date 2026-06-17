export type EmotionName =
  | "happy"
  | "nervous"
  | "lost";

export interface EmotionVisualConfig {
  id: number;
  name: EmotionName;
  label: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
}

export const EMOTION_BY_ID: Record<
  number,
  EmotionVisualConfig
> = {
  1: {
    id: 1,
    name: "happy",
    label: "Happy",
    imagePath: "/emotions/happy.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
  },

  2: {
    id: 2,
    name: "nervous",
    label: "Nervous",
    imagePath: "/emotions/nervous.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 6,
  },

  3: {
    id: 3,
    name: "lost",
    label: "Lost",
    imagePath: "/emotions/lost.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    fps: 4,
  },
};

export const EMOTION_ID_BY_NAME: Record<
  EmotionName,
  number
> = {
  happy: 1,
  nervous: 2,
  lost: 3,
};

export const EMOTION_NAMES = Object.values(
  EMOTION_BY_ID
).map(
  (emotion) => emotion.name
);

export const getEmotionById = (
  emotionId: number
): EmotionVisualConfig | null => {
  return EMOTION_BY_ID[emotionId] ?? null;
};

export const getEmotionByName = (
  emotionName: EmotionName
): EmotionVisualConfig => {
  const emotionId =
    EMOTION_ID_BY_NAME[emotionName];

  return EMOTION_BY_ID[emotionId];
};