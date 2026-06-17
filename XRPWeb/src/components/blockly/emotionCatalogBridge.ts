import {
  listCustomEmotions,
} from "../dashboard/emotions/customEmotionStore";

import {
  CUSTOM_EMOTIONS_CHANGED_EVENT,
} from "../dashboard/emotions/customEmotionEvents";

import type {
  CustomEmotionRepeatMode,
} from "../dashboard/emotions/customEmotionTypes";


export interface BlocklyEmotionEntry {
  uniqueName: string;
  displayName: string;
  emotionId: number;

  defaultFps: number;

  repeatMode:
    CustomEmotionRepeatMode | null;

  repeatCount: number | null;

  isCustom: boolean;
}


type BlocklyDropdownOption = [
  string,
  string,
];


const OFFICIAL_EMOTIONS:
  BlocklyEmotionEntry[] = [
    {
      uniqueName: "idle",
      displayName: "Idle",
      emotionId: 0,
      defaultFps: 0,
      repeatMode: "once",
      repeatCount: null,
      isCustom: false,
    },
    {
      uniqueName: "happy",
      displayName: "Happy",
      emotionId: 1,
      defaultFps: 4,
      repeatMode: "loop",
      repeatCount: null,
      isCustom: false,
    },
    {
      uniqueName: "nervous",
      displayName: "Nervous",
      emotionId: 2,
      defaultFps: 6,
      repeatMode: "loop",
      repeatCount: null,
      isCustom: false,
    },
    {
      uniqueName: "lost",
      displayName: "Lost",
      emotionId: 3,
      defaultFps: 4,
      repeatMode: "loop",
      repeatCount: null,
      isCustom: false,
    },
  ];


let customEmotions:
  BlocklyEmotionEntry[] = [];

let initialized = false;

let refreshPromise:
  Promise<void> | null = null;


export async function
refreshEmotionBlocklyCatalog():
  Promise<void> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (
    async () => {
      try {
        const records =
          await listCustomEmotions();

        customEmotions = records
          .map((record) => ({
            uniqueName:
              record.uniqueName,

            displayName:
              record.displayName,

            emotionId:
              record.emotionId,

            defaultFps:
              record.defaultFps,

            repeatMode:
              record.repeatMode,

            repeatCount:
              record.repeatCount,

            isCustom: true,
          }))
          .sort(
            (first, second) =>
              first.displayName
                .localeCompare(
                  second.displayName
                )
          );
      } catch (error) {
        console.error(
          "Could not load custom " +
            "emotions for Blockly:",
          error
        );

        customEmotions = [];
      } finally {
        refreshPromise = null;
      }
    }
  )();

  return refreshPromise;
}


export function
initializeEmotionBlocklyCatalog():
  void {
  if (
    initialized ||
    typeof window === "undefined"
  ) {
    return;
  }

  initialized = true;

  void refreshEmotionBlocklyCatalog();

  window.addEventListener(
    CUSTOM_EMOTIONS_CHANGED_EVENT,
    () => {
      void refreshEmotionBlocklyCatalog();
    }
  );
}


export function
getAllEmotionEntries():
  BlocklyEmotionEntry[] {
  return [
    ...OFFICIAL_EMOTIONS,
    ...customEmotions,
  ];
}


export function
getEmotionEntryByName(
  uniqueName: string
): BlocklyEmotionEntry | undefined {
  return getAllEmotionEntries()
    .find(
      (emotion) =>
        emotion.uniqueName ===
        uniqueName
    );
}


export function
getPlayableEmotionDropdownOptions():
  BlocklyDropdownOption[] {
  return getAllEmotionEntries()
    .map((emotion) => [
      emotion.isCustom
        ? `${emotion.displayName} ★`
        : emotion.displayName,

      emotion.uniqueName,
    ]);
}


export function
getConfigurableEmotionDropdownOptions():
  BlocklyDropdownOption[] {
  return getAllEmotionEntries()
    .filter(
      (emotion) =>
        emotion.uniqueName !==
        "idle"
    )
    .map((emotion) => [
      emotion.isCustom
        ? `${emotion.displayName} ★`
        : emotion.displayName,

      emotion.uniqueName,
    ]);
}


initializeEmotionBlocklyCatalog();