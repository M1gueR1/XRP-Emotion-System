import type {
  CustomEmotionInput,
  CustomEmotionRecord,
} from "./customEmotionTypes";

import {
  OFFICIAL_EMOTION_NAMES,
} from "./officialEmotionCatalog";


const DATABASE_NAME =
  "xrp-emotion-framework";

const DATABASE_VERSION = 1;

const STORE_NAME =
  "custom-emotions";

const EMOTION_ID_INDEX =
  "emotion-id";

const DISPLAY_NAME_INDEX =
  "display-name";


export const CUSTOM_EMOTION_ID_MIN = 128;
export const CUSTOM_EMOTION_ID_MAX = 255;

const MAX_CUSTOM_SOUND_BYTES = 5 * 1024 * 1024;






function requestToPromise<T>(
  request: IDBRequest<T>
): Promise<T> {
  return new Promise<T>(
    (resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "IndexedDB request failed"
            )
        );
      };
    }
  );
}


function transactionToPromise(
  transaction: IDBTransaction
): Promise<void> {
  return new Promise<void>(
    (resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "IndexedDB transaction failed"
            )
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ??
            new Error(
              "IndexedDB transaction was aborted"
            )
        );
      };
    }
  );
}


function openDatabase():
  Promise<IDBDatabase> {
  return new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request =
        window.indexedDB.open(
          DATABASE_NAME,
          DATABASE_VERSION
        );

      request.onupgradeneeded = () => {
        const database =
          request.result;

        if (
          !database.objectStoreNames
            .contains(STORE_NAME)
        ) {
          const store =
            database.createObjectStore(
              STORE_NAME,
              {
                keyPath: "uniqueName",
              }
            );

          store.createIndex(
            EMOTION_ID_INDEX,
            "emotionId",
            {
              unique: true,
            }
          );

          store.createIndex(
            DISPLAY_NAME_INDEX,
            "displayName",
            {
              unique: false,
            }
          );
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "Could not open emotion database"
            )
        );
      };

      request.onblocked = () => {
        reject(
          new Error(
            "Emotion database update is blocked"
          )
        );
      };
    }
  );
}


function normalizeUniqueName(
  value: string
): string {
  if (typeof value !== "string") {
    throw new TypeError(
      "uniqueName must be a string"
    );
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}


function validateEmotionInput(
  input: CustomEmotionInput
): CustomEmotionInput {
  const uniqueName =
    normalizeUniqueName(
      input.uniqueName
    );

  if (
    !/^[a-z][a-z0-9_]{0,31}$/.test(
      uniqueName
    )
  ) {
    throw new Error(
      "uniqueName must begin with a letter " +
        "and contain only lowercase letters, " +
        "numbers and underscores"
    );
  }

  if (
    OFFICIAL_EMOTION_NAMES.has(
      uniqueName
    )
  ) {
    throw new Error(
      `"${uniqueName}" is reserved by ` +
        "the Emotion Framework"
    );
  }

  const displayName =
    input.displayName.trim();

  if (!displayName) {
    throw new Error(
      "displayName cannot be empty"
    );
  }

  if (
    !Number.isInteger(
      input.emotionId
    ) ||
    input.emotionId <
      CUSTOM_EMOTION_ID_MIN ||
    input.emotionId >
      CUSTOM_EMOTION_ID_MAX
  ) {
    throw new Error(
      "Custom emotionId must be " +
        "between 128 and 255"
    );
  }

  if (
    !(input.spriteBlob instanceof Blob)
  ) {
    throw new TypeError(
      "spriteBlob must be a Blob"
    );
  }

  if (
    input.spriteBlob.type !==
    "image/png"
  ) {
    throw new Error(
      "The sprite must be a PNG image"
    );
  }

  if (
    input.spriteBlob.size === 0
  ) {
    throw new Error(
      "The PNG file is empty"
    );
  }

  const integerFields = [
    [
      "frameWidth",
      input.frameWidth,
    ],
    [
      "frameHeight",
      input.frameHeight,
    ],
    [
      "frameCount",
      input.frameCount,
    ],
  ] as const;

  for (
    const [
      fieldName,
      fieldValue,
    ] of integerFields
  ) {
    if (
      !Number.isInteger(fieldValue) ||
      fieldValue <= 0
    ) {
      throw new Error(
        `${fieldName} must be a ` +
          "positive integer"
      );
    }
  }

  /*
   * The current XPP frame-subset format uses
   * four bits per frame index.
   */
  const MAX_DASHBOARD_FRAMES = 1024;

  if (input.frameCount > MAX_DASHBOARD_FRAMES) {
    throw new Error(
      "The dashboard supports a maximum of " +
        `${MAX_DASHBOARD_FRAMES} frames per custom sprite.`
    );
  }

  if (
    typeof input.defaultFps !==
      "number" ||
    !Number.isFinite(
      input.defaultFps
    ) ||
    input.defaultFps <= 0 ||
    input.defaultFps > 60
  ) {
    throw new Error(
      "defaultFps must be between " +
        "0 and 60"
    );
  }

  const validRepeatModes =
    new Set([
      "once",
      "loop",
      "count",
      "ping_pong",
    ]);

  if (
    !validRepeatModes.has(
      input.repeatMode
    )
  ) {
    throw new Error(
      "Invalid repeatMode"
    );
  }

  let repeatCount =
    input.repeatCount;

  if (
    input.repeatMode === "count"
  ) {
    if (
      !Number.isInteger(
        repeatCount
      ) ||
      repeatCount === null ||
      repeatCount <= 0
    ) {
      throw new Error(
        "repeatMode 'count' requires " +
          "a positive repeatCount"
      );
    }
  } else {
    repeatCount = null;
  }

  const validSoundModes =
      new Set([
        "default",
        "custom",
        "none",
      ]);

    const soundMode =
      input.soundMode ?? "default";

    if (
      !validSoundModes.has(
        soundMode
      )
    ) {
      throw new Error(
        "Invalid emotion sound mode"
      );
    }

    let soundBlob =
      input.soundBlob ?? null;

    if (soundMode === "custom") {
      if (
        !(soundBlob instanceof Blob)
      ) {
        throw new Error(
          "Select an audio file for " +
            "the custom sound."
        );
      }

      if (
        !soundBlob.type.startsWith(
          "audio/"
        )
      ) {
        throw new Error(
          "The custom sound must be " +
            "an audio file."
        );
      }

      if (soundBlob.size === 0) {
        throw new Error(
          "The selected audio file is empty."
        );
      }

      if (
        soundBlob.size >
        MAX_CUSTOM_SOUND_BYTES
      ) {
        throw new Error(
          "The audio file must be " +
            "smaller than 5 MB."
        );
      }
    } else {
      /*
      * Default and none do not need to retain
      * a custom audio file.
      */
      soundBlob = null;
    }

  return {
    ...input,
    uniqueName,
    displayName,
    repeatCount,
    soundMode,
    soundBlob,
  };
}


export async function listCustomEmotions():
  Promise<CustomEmotionRecord[]> {
  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const records =
      await requestToPromise(
        store.getAll()
      ) as CustomEmotionRecord[];

    return records.sort(
      (first, second) =>
        first.displayName.localeCompare(
          second.displayName
        )
    );
  } finally {
    database.close();
  }
}


export async function getCustomEmotion(
  uniqueName: string
): Promise<
  CustomEmotionRecord | undefined
> {
  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    return await requestToPromise(
      store.get(
        normalizeUniqueName(
          uniqueName
        )
      )
    ) as
      | CustomEmotionRecord
      | undefined;
  } finally {
    database.close();
  }
}


export async function getCustomEmotionById(
  emotionId: number
): Promise<
  CustomEmotionRecord | undefined
> {
  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readonly"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    const index =
      store.index(
        EMOTION_ID_INDEX
      );

    return await requestToPromise(
      index.get(emotionId)
    ) as
      | CustomEmotionRecord
      | undefined;
  } finally {
    database.close();
  }
}


export async function findNextCustomEmotionId():
  Promise<number> {
  const emotions =
    await listCustomEmotions();

  const usedIds =
    new Set(
      emotions.map(
        (emotion) =>
          emotion.emotionId
      )
    );

  for (
    let candidate =
      CUSTOM_EMOTION_ID_MIN;
    candidate <=
      CUSTOM_EMOTION_ID_MAX;
    candidate += 1
  ) {
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No custom emotion IDs are available"
  );
}


export async function saveCustomEmotion(
  input: CustomEmotionInput
): Promise<CustomEmotionRecord> {
  const normalizedInput =
    validateEmotionInput(input);

  const existingByName =
    await getCustomEmotion(
      normalizedInput.uniqueName
    );

  const existingById =
    await getCustomEmotionById(
      normalizedInput.emotionId
    );

  if (
    existingById &&
    existingById.uniqueName !==
      normalizedInput.uniqueName
  ) {
    throw new Error(
      `Emotion ID ${
        normalizedInput.emotionId
      } is already used by "${
        existingById.displayName
      }"`
    );
  }

  const now = Date.now();

  const record:
    CustomEmotionRecord = {
      ...normalizedInput,

      schemaVersion: 1,

      createdAt:
        existingByName?.createdAt ??
        now,

      updatedAt: now,
    };

  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    store.put(record);

    await transactionToPromise(
      transaction
    );

    return record;
  } finally {
    database.close();
  }
}


export async function deleteCustomEmotion(
  uniqueName: string
): Promise<void> {
  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readwrite"
      );

    const store =
      transaction.objectStore(
        STORE_NAME
      );

    store.delete(
      normalizeUniqueName(
        uniqueName
      )
    );

    await transactionToPromise(
      transaction
    );
  } finally {
    database.close();
  }
}


export async function clearCustomEmotions():
  Promise<void> {
  const database =
    await openDatabase();

  try {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readwrite"
      );

    transaction
      .objectStore(STORE_NAME)
      .clear();

    await transactionToPromise(
      transaction
    );
  } finally {
    database.close();
  }
}


/*
 * Object URLs are temporary.
 * Components must call URL.revokeObjectURL()
 * when the preview is no longer displayed.
 */
export function createEmotionSpriteUrl(
  emotion: CustomEmotionRecord
): string {
  return URL.createObjectURL(
    emotion.spriteBlob
  );
}