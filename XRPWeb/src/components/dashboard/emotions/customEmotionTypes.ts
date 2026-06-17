export type CustomEmotionRepeatMode =
  | "once"
  | "loop"
  | "count"
  | "ping_pong";

export type CustomEmotionSoundMode =
  | "default"
  | "custom"
  | "none";


export interface CustomEmotionRecord {
  schemaVersion: 1;

  uniqueName: string;
  displayName: string;

  /*
   * IDs 0-127 remain reserved for framework and
   * official emotions.
   *
   * IDs 128-255 are available for custom emotions.
   */
  emotionId: number;

  /*
   * The PNG stays in the browser through IndexedDB.
   * It is never copied to the XRP.
   */
  spriteBlob: Blob;

  frameWidth: number;
  frameHeight: number;
  frameCount: number;

  defaultFps: number;

  repeatMode: CustomEmotionRepeatMode;
  repeatCount: number | null;

  createdAt: number;
  updatedAt: number;


  //for audio part:

  soundMode?: CustomEmotionSoundMode;

  soundBlob?: Blob | null;
}


export type CustomEmotionInput = Omit<
  CustomEmotionRecord,
  | "schemaVersion"
  | "createdAt"
  | "updatedAt"
>;