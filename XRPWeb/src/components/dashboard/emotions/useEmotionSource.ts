import {
  useCallback,
  useState,
} from "react";

import type {
  EmotionMessage,
} from "./types";

import {
  DEFAULT_EMOTION_MESSAGE,
} from "./types";


export function useEmotionSource() {
  const [message, setMessage] =
    useState<EmotionMessage>(
      DEFAULT_EMOTION_MESSAGE
    );

  const playEmotion = useCallback(
    (
      emotionId: number,
      forceReset = false
    ) => {
      setMessage((current) => {
        const changed =
          current.emotionId !== emotionId;

        return {
          emotionId,
          generation:
            changed || forceReset
              ? current.generation + 1
              : current.generation,
          playbackFps:
            current.playbackFps || 4,
          status: "playing",
        };
      });
    },
    []
  );

  const clearEmotion = useCallback(() => {
    setMessage((current) => ({
      ...current,
      emotionId: 0,
      generation:
        current.generation + 1,
      status: "idle",
    }));
  }, []);

  return {
    message,
    playEmotion,
    clearEmotion,
  };
}