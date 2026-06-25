export type OfficialEmotionRepeatMode =
  | "once"
  | "loop"
  | "count"
  | "ping_pong";


export interface OfficialEmotionDefinition {
  id: number;
  uniqueName: string;
  displayName: string;

  imagePath: string;

  frameWidth: number;
  frameHeight: number;
  frameCount: number;

  defaultFps: number;

  repeatMode:
    OfficialEmotionRepeatMode;

  repeatCount: number | null;
}


export const OFFICIAL_EMOTIONS = [
  {
    id: 0,
    uniqueName: "idle",
    displayName: "Idle",
    imagePath:
      "/emotions/official/BlinkAwakeChanged.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount:66,
    defaultFps: 55,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 1,
    uniqueName: "happy",
    displayName: "Happy",
    imagePath:
      "/emotions/official/chuckled.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 33,
    defaultFps: 25,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 2,
    uniqueName: "chuckled",
    displayName: "Chuckled",
    imagePath:
      "/emotions/official/chuckled.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 33,
    defaultFps: 30,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 3,
    uniqueName: "excited",
    displayName: "Excited",
    imagePath:
      "/emotions/official/excited.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 63,
    defaultFps: 55,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 4,
    uniqueName: "celebration",
    displayName: "Celebration",
    imagePath:
      "/emotions/official/celebration.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    defaultFps: 8,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 5,
    uniqueName: "amazed",
    displayName: "Amazed",
    imagePath:
      "/emotions/official/amazed.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 3,
    defaultFps: 6,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 6,
    uniqueName: "puzzled",
    displayName: "Puzzled",
    imagePath:
      "/emotions/official/puzzled.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    defaultFps: 5,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 7,
    uniqueName: "frustrated",
    displayName: "Frustrated",
    imagePath:
      "/emotions/official/frustrated.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 3,
    defaultFps: 6,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 8,
    uniqueName: "upset",
    displayName: "Upset",
    imagePath:
      "/emotions/official/upset.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 3,
    defaultFps: 5,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 9,
    uniqueName: "sad",
    displayName: "Sad",
    imagePath:
      "/emotions/official/sad.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 21,
    defaultFps: 20,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 10,
    uniqueName: "angry",
    displayName: "Angry",
    imagePath:
      "/emotions/official/angry.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 4,
    defaultFps: 7,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 11,
    uniqueName: "love_it",
    displayName: "Love It",
    imagePath:
      "/emotions/official/love_it.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 2,
    defaultFps: 6,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 12,
    uniqueName: "in_love",
    displayName: "In Love",
    imagePath:
      "/emotions/official/in_love.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 3,
    defaultFps: 5,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 13,
    uniqueName: "delighted",
    displayName: "Delighted",
    imagePath:
      "/emotions/official/delighted.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 2,
    defaultFps: 6,
    repeatMode: "loop",
    repeatCount: null,
  },
  {
    id: 14,
    uniqueName: "ready_to_race",
    displayName: "Ready to Race",
    imagePath:
      "/emotions/official/ready_to_race.png",
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 2,
    defaultFps: 8,
    repeatMode: "loop",
    repeatCount: null,
  },
] as const satisfies
  readonly OfficialEmotionDefinition[];


export type OfficialEmotionName =
  typeof OFFICIAL_EMOTIONS[number][
    "uniqueName"
  ];


export const OFFICIAL_EMOTION_NAMES =
  new Set<string>(
    OFFICIAL_EMOTIONS.map(
      (emotion) =>
        emotion.uniqueName
    )
  );