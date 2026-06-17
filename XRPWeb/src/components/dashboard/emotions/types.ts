export type EmotionStatus =
  | "idle"
  | "playing"
  | "finished";

export interface EmotionMessage {
  emotionId: number;
  generation: number;
  playbackFps: number;
  status: EmotionStatus;
}

export const DEFAULT_EMOTION_MESSAGE:
  EmotionMessage = {
    emotionId: 0,
    generation: 0,
    playbackFps: 4,
    status: "idle",
  };