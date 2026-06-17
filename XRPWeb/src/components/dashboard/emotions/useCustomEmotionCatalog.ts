import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  listCustomEmotions,
} from "./customEmotionStore";

import {
  CUSTOM_EMOTIONS_CHANGED_EVENT,
} from "./customEmotionEvents";

import type {
  CustomEmotionRepeatMode,
  CustomEmotionSoundMode,
} from "./customEmotionTypes";


export interface CustomEmotionVisualConfig {
  id: number;
  name: string;
  label: string;

  imagePath: string;

  frameWidth: number;
  frameHeight: number;
  frameCount: number;

  fps: number;

  repeatMode:
    CustomEmotionRepeatMode;

  repeatModeId: number;
  repeatCount: number;

  soundMode:
    CustomEmotionSoundMode;

  soundBlob: Blob | null;
}


const REPEAT_MODE_IDS:
  Record<
    CustomEmotionRepeatMode,
    number
  > = {
    once: 1,
    loop: 2,
    count: 3,
    ping_pong: 4,
  };


function revokeUrls(
  urls: string[]
): void {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}


function useCustomEmotionCatalog() {
  const [
    customEmotionById,
    setCustomEmotionById,
  ] = useState<
    Map<
      number,
      CustomEmotionVisualConfig
    >
  >(new Map());

  const objectUrlsRef =
    useRef<string[]>([]);


  const refreshCustomEmotions =
    useCallback(async () => {
      const records =
        await listCustomEmotions();

      const nextUrls: string[] = [];

      const nextCatalog =
        new Map<
          number,
          CustomEmotionVisualConfig
        >();

      for (const record of records) {
        const imagePath =
          URL.createObjectURL(
            record.spriteBlob
          );

        nextUrls.push(imagePath);

        nextCatalog.set(
          record.emotionId,
          {
            id: record.emotionId,
            name: record.uniqueName,
            label: record.displayName,

            imagePath,

            frameWidth:
              record.frameWidth,

            frameHeight:
              record.frameHeight,

            frameCount:
              record.frameCount,

            fps:
              record.defaultFps,

            repeatMode:
              record.repeatMode,

            repeatModeId:
              REPEAT_MODE_IDS[
                record.repeatMode
              ],

            repeatCount:
              record.repeatCount ?? -1,

            soundMode:
              record.soundMode ??
              "default",

            soundBlob:
              record.soundBlob ??
              null,
          }
        );
      }

      const previousUrls =
        objectUrlsRef.current;

      objectUrlsRef.current =
        nextUrls;

      setCustomEmotionById(
        nextCatalog
      );

      revokeUrls(previousUrls);
    }, []);


  useEffect(() => {
    void refreshCustomEmotions();

    const handleCatalogChange =
      () => {
        void refreshCustomEmotions();
      };

    window.addEventListener(
      CUSTOM_EMOTIONS_CHANGED_EVENT,
      handleCatalogChange
    );

    return () => {
      window.removeEventListener(
        CUSTOM_EMOTIONS_CHANGED_EVENT,
        handleCatalogChange
      );

      revokeUrls(
        objectUrlsRef.current
      );

      objectUrlsRef.current = [];
    };
  }, [refreshCustomEmotions]);


  return {
    customEmotionById,
    refreshCustomEmotions,
  };
}


export default useCustomEmotionCatalog;