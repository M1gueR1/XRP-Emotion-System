import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import Dialog from "../../dialogs/dialog";

import {
  notifyCustomEmotionsChanged,
} from "./customEmotionEvents";

import {
  createEmotionSpriteUrl,
  deleteCustomEmotion,
  findNextCustomEmotionId,
  listCustomEmotions,
  saveCustomEmotion,
} from "./customEmotionStore";

import type {
  CustomEmotionRecord,
  CustomEmotionRepeatMode,
  CustomEmotionSoundMode,
} from "./customEmotionTypes";

import EmotionSpritePreview from
  "./EmotionSpritePreview";

const REPEAT_MODE_HELP:
  Record<
    CustomEmotionRepeatMode,
    string
  > = {
    once:
      "Plays the animation one time and stops on the last frame.",

    loop:
      "Repeats continuously while the emotion is active.",

    count:
      "Repeats the animation a specific number of times.",

    ping_pong:
      "Plays forward and then backward continuously.",
  };


type ManageEmotionsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onChanged?: () => void;
};


type StoredEmotionPreviewProps = {
  emotion: CustomEmotionRecord;
};


function StoredEmotionPreview({
  emotion,
}: StoredEmotionPreviewProps) {
  const [imageUrl, setImageUrl] =
    useState("");


  useEffect(() => {
    const nextUrl =
      createEmotionSpriteUrl(
        emotion
      );

    setImageUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(
        nextUrl
      );
    };
  }, [emotion]);


  return (
    <EmotionSpritePreview
      imageUrl={imageUrl}
      frameWidth={
        emotion.frameWidth
      }
      frameHeight={
        emotion.frameHeight
      }
      frameCount={
        emotion.frameCount
      }
      fps={emotion.defaultFps}
      maxDisplaySize={110}
    />
  );
}


const RESERVED_EMOTION_NAMES =
  new Set([
    "idle",
    "happy",
    "nervous",
    "lost",
  ]);


function normalizeUniqueName(
  value: string
): string {
  let result = value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );

  if (
    !result ||
    !/^[a-z]/.test(result)
  ) {
    result =
      `emotion_${result || "custom"}`;
  }

  if (
    RESERVED_EMOTION_NAMES.has(
      result
    )
  ) {
    result = `custom_${result}`;
  }

  return result.slice(0, 32);
}


function createAutomaticUniqueName(
  displayName: string,
  existingEmotions:
    CustomEmotionRecord[]
): string {
  const baseName =
    normalizeUniqueName(
      displayName
    );

  const usedNames =
    new Set(
      existingEmotions.map(
        (emotion) =>
          emotion.uniqueName
      )
    );

  if (!usedNames.has(baseName)) {
    return baseName;
  }

  let counter = 2;

  while (true) {
    const suffix = `_${counter}`;

    const candidate =
      baseName.slice(
        0,
        32 - suffix.length
      ) + suffix;

    if (
      !usedNames.has(candidate)
    ) {
      return candidate;
    }

    counter += 1;
  }
}


function ManageEmotionsDialog({
  isOpen,
  onClose,
  onChanged,
}: ManageEmotionsDialogProps) {
  const [
    customEmotions,
    setCustomEmotions,
  ] = useState<
    CustomEmotionRecord[]
  >([]);

  const [
    editingUniqueName,
    setEditingUniqueName,
  ] = useState<
    string | null
  >(null);

  const [
    displayName,
    setDisplayName,
  ] = useState("");


  const [
    emotionId,
    setEmotionId,
  ] = useState(128);

  const [
    spriteBlob,
    setSpriteBlob,
  ] = useState<Blob | null>(
    null
  );

  const [
    spriteFileName,
    setSpriteFileName,
  ] = useState("");

  const [
    spriteUrl,
    setSpriteUrl,
  ] = useState("");

  const [
    sheetWidth,
    setSheetWidth,
  ] = useState(0);

  const [
    sheetHeight,
    setSheetHeight,
  ] = useState(0);

  const [
    frameCount,
    setFrameCount,
  ] = useState(4);

  const [
    defaultFps,
    setDefaultFps,
  ] = useState(6);

  const [
    repeatMode,
    setRepeatMode,
  ] =
    useState<
      CustomEmotionRepeatMode
    >("loop");

  const [
    repeatCount,
    setRepeatCount,
  ] = useState(3);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    soundMode,
    setSoundMode,
  ] =
    useState<
      CustomEmotionSoundMode
    >("default");


  const [
    soundBlob,
    setSoundBlob,
  ] = useState<Blob | null>(
    null
  );


  const [
    soundFileName,
    setSoundFileName,
  ] = useState("");


  const [
    soundPreviewUrl,
    setSoundPreviewUrl,
  ] = useState("");


  const calculatedFrameWidth =
    (
      sheetWidth > 0 &&
      frameCount > 0 &&
      sheetWidth % frameCount === 0
    )
      ? sheetWidth / frameCount
      : 0;

  const calculatedFrameHeight =
    sheetHeight;


  const notifyChanged = useCallback(
    () => {
      notifyCustomEmotionsChanged();

      onChanged?.();
    },
    [onChanged]
  );


  const refreshEmotionList =
    useCallback(async () => {
      const records =
        await listCustomEmotions();

      setCustomEmotions(
        records
      );
    }, []);


  const resetForm =
    useCallback(
      async () => {
        setEditingUniqueName(null);

        setDisplayName("");

        setSpriteBlob(null);
        setSpriteFileName("");
        setSheetWidth(0);
        setSheetHeight(0);

        setFrameCount(4);
        setDefaultFps(6);

        setRepeatMode("loop");
        setRepeatCount(3);

        setStatusMessage("");
        setErrorMessage("");

        setSoundMode("default");
        setSoundBlob(null);
        setSoundFileName("");

        try {
          const nextId =
            await findNextCustomEmotionId();

          setEmotionId(nextId);
        } catch {
          setEmotionId(128);
        }
      },
      []
    );


  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshEmotionList();
    void resetForm();
  }, [
    isOpen,
    refreshEmotionList,
    resetForm,
  ]);


  useEffect(() => {
    if (!spriteBlob) {
      setSpriteUrl("");
      return;
    }

    const nextUrl =
      URL.createObjectURL(
        spriteBlob
      );

    setSpriteUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(
        nextUrl
      );
    };
  }, [spriteBlob]);

  useEffect(() => {
    if (!soundBlob) {
      setSoundPreviewUrl("");
      return;
    }

    const nextUrl =
      URL.createObjectURL(
        soundBlob
      );

    setSoundPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(
        nextUrl
      );
    };
  }, [soundBlob]);


  useEffect(() => {
    if (!spriteUrl) {
      setSheetWidth(0);
      setSheetHeight(0);
      return;
    }

    const image = new Image();

    image.onload = () => {
      setSheetWidth(
        image.naturalWidth
      );

      setSheetHeight(
        image.naturalHeight
      );
    };

    image.onerror = () => {
      setErrorMessage(
        "The PNG image could not be read."
      );

      setSheetWidth(0);
      setSheetHeight(0);
    };

    image.src = spriteUrl;
  }, [spriteUrl]);


  const handleDisplayNameChange = (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      setDisplayName(
        event.target.value
      );
    };



  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    setErrorMessage("");
    setStatusMessage("");

    if (!file) {
      return;
    }

    if (
      file.type !== "image/png"
    ) {
      setErrorMessage(
        "Select a PNG file exported from Piskel."
      );

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setErrorMessage(
        "The selected PNG file is empty."
      );

      event.target.value = "";
      return;
    }

    setSpriteBlob(file);
    setSpriteFileName(
      file.name
    );
  };

  const handleSoundFileChange = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    setErrorMessage("");
    setStatusMessage("");

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "audio/"
      )
    ) {
      setErrorMessage(
        "Select a valid audio file."
      );

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setErrorMessage(
        "The selected audio file is empty."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setErrorMessage(
        "The audio file must be " +
          "smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    setSoundBlob(file);

    setSoundFileName(
      file.name
    );
  };


  const handleSave = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setStatusMessage("");

    if (!spriteBlob) {
      setErrorMessage(
        "Select a PNG spritesheet."
      );

      return;
    }

    if (
      sheetWidth <= 0 ||
      sheetHeight <= 0
    ) {
      setErrorMessage(
        "The PNG dimensions are unavailable."
      );

      return;
    }

    if (
      frameCount <= 0 ||
      !Number.isInteger(
        frameCount
      )
    ) {
      setErrorMessage(
        "Frame count must be a positive integer."
      );

      return;
    }

    if (
      sheetWidth % frameCount !== 0
    ) {
      setErrorMessage(
        "The PNG width must be divisible " +
        "by the frame count. This MVP " +
        "expects one horizontal row."
      );

      return;
    }

    if (
      calculatedFrameWidth <= 0 ||
      calculatedFrameHeight <= 0
    ) {
      setErrorMessage(
        "The calculated frame size is invalid."
      );

      return;
    }

    const wasEditing = editingUniqueName !== null;

  const automaticUniqueName = editingUniqueName ?? createAutomaticUniqueName(
      displayName,
      customEmotions
    );

    if (
      soundMode === "custom" &&
      soundBlob === null
    ) {
      setErrorMessage(
        "Select an audio file or " +
          "use the default sound."
      );

      return;
    }

    try {
      setIsSaving(true);

      await saveCustomEmotion({
        uniqueName: automaticUniqueName,
        displayName,
        emotionId,

        spriteBlob,

        frameWidth:
          calculatedFrameWidth,

        frameHeight:
          calculatedFrameHeight,

        frameCount,
        defaultFps,

        repeatMode,

        repeatCount:
          repeatMode === "count"
            ? repeatCount
            : null,

        soundMode,

        soundBlob:
          soundMode === "custom"
            ? soundBlob
            : null,
      });

      await refreshEmotionList();

      notifyChanged();

      await resetForm();

      setStatusMessage(
        wasEditing
          ? "Emotion updated."
          : "Emotion saved."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : String(error)
      );
    } finally {
      setIsSaving(false);
    }
  };


  const handleEdit = (
    record:
      CustomEmotionRecord
  ) => {
    setEditingUniqueName(
      record.uniqueName
    );

    setDisplayName(
      record.displayName
    );

    setEmotionId(
      record.emotionId
    );

    setSpriteBlob(
      record.spriteBlob
    );

    setSpriteFileName(
      `${record.uniqueName}.png`
    );

    setFrameCount(
      record.frameCount
    );

    setDefaultFps(
      record.defaultFps
    );

    setRepeatMode(
      record.repeatMode
    );

    setRepeatCount(
      record.repeatCount ?? 3
    );

    setStatusMessage("");
    setErrorMessage("");

    setSoundMode(
      record.soundMode ??
      "default"
    );

  setSoundBlob(
    record.soundBlob ??
    null
  );

  setSoundFileName(
    record.soundBlob
      ? `${record.uniqueName}-sound`
      : ""
  );

  };


  const handleDelete = async (
    record:
      CustomEmotionRecord
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${record.displayName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomEmotion(
        record.uniqueName
      );

      await refreshEmotionList();

      if (
        editingUniqueName ===
        record.uniqueName
      ) {
        await resetForm();
      }

      setStatusMessage(
        "Emotion deleted."
      );

      notifyChanged();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  };


  return (
    <Dialog
      isOpen={isOpen}
      toggleDialog={onClose}
    >
      <div className="flex max-h-[90vh] w-[min(96vw,1100px)] flex-col overflow-hidden rounded-xl bg-white text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h1 className="text-xl font-bold">
              Manage Custom Emotions
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Import horizontal PNG spritesheets
              exported from Piskel.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            ×
          </button>
        </header>


        <div className="grid flex-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <form
            onSubmit={handleSave}
            className="flex flex-col gap-5"
          >
            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h2 className="mb-4 font-semibold">
                  Emotion information
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Emotion name

                    <input
                      type="text"
                      value={displayName}
                      onChange={
                        handleDisplayNameChange
                      }
                      required
                      placeholder="Excited"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    PNG spritesheet

                    <input
                      type="file"
                      accept="image/png"
                      onChange={
                        handleFileChange
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />

                    {spriteFileName && (
                      <span className="text-xs text-slate-500">
                        {spriteFileName}
                      </span>
                    )}
                  </label>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  The technical name and emotion ID
                  are assigned automatically.
                </p>
              </section>


            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h2 className="mb-4 font-semibold">
                Animation configuration
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Frame count

                  <input
                    type="number"
                    min={1}
                    max={16}
                    step={1}
                    value={frameCount}
                    onChange={(event) => {
                      setFrameCount(
                        Number(
                          event.target.value
                        )
                      );
                    }}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Default FPS

                  <input
                    type="number"
                    min={1}
                    max={60}
                    step={1}
                    value={defaultFps}
                    onChange={(event) => {
                      setDefaultFps(
                        Number(
                          event.target.value
                        )
                      );
                    }}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                    Repeat mode

                    <select
                      value={repeatMode}
                      onChange={(event) => {
                        setRepeatMode(
                          event.target.value as
                            CustomEmotionRepeatMode
                        );
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    >
                      <option value="once">
                        Once
                      </option>

                      <option value="loop">
                        Loop
                      </option>

                      <option value="count">
                        Fixed count
                      </option>

                      <option value="ping_pong">
                        Ping-pong
                      </option>
                    </select>

                    <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {REPEAT_MODE_HELP[repeatMode]}
                    </span>
                  </label>

                <label className="flex flex-col gap-1 text-sm">
                  Repeat count

                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={repeatCount}
                    disabled={
                      repeatMode !==
                      "count"
                    }
                    onChange={(event) => {
                      setRepeatCount(
                        Number(
                          event.target.value
                        )
                      );
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
              </div>


              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-900">
                <div>
                  Sheet size:{" "}
                  {sheetWidth > 0
                    ? `${sheetWidth} × ${sheetHeight}`
                    : "Not loaded"}
                </div>

                <div>
                  Calculated frame size:{" "}
                  {calculatedFrameWidth > 0
                    ? `${calculatedFrameWidth} × ${calculatedFrameHeight}`
                    : "Invalid or unavailable"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  For this MVP, frames must be
                  arranged in one horizontal row.
                </div>
              </div>
            </section>


            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h2 className="font-semibold">
                Emotion sound
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Audio is stored only in this browser.
                It is never uploaded to the XRP robot.
              </p>

              <label className="mt-4 flex flex-col gap-1 text-sm">
                Sound

                <select
                  value={soundMode}
                  onChange={(event) => {
                    setSoundMode(
                      event.target.value as
                        CustomEmotionSoundMode
                    );
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="default">
                    Default emotion sound
                  </option>

                  <option value="custom">
                    Use my own audio
                  </option>

                  <option value="none">
                    No sound
                  </option>
                </select>

                <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {soundMode === "default"
                    ? (
                      "Uses the short sound generated " +
                      "automatically by XRPWeb."
                    )
                    : soundMode === "custom"
                      ? (
                        "Plays the selected audio once " +
                        "when the emotion starts."
                      )
                      : (
                        "This emotion will remain silent."
                      )}
                </span>
              </label>


              {soundMode === "custom" && (
                <div className="mt-4 flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    Audio file

                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a,audio/*"
                      onChange={
                        handleSoundFileChange
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    />

                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      MP3, WAV, OGG or M4A.
                      Maximum size: 5 MB.
                    </span>

                    {soundFileName && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {soundFileName}
                      </span>
                    )}
                  </label>

                  {soundPreviewUrl && (
                    <audio
                      controls
                      preload="metadata"
                      src={soundPreviewUrl}
                      className="w-full"
                    >
                      Your browser does not support
                      audio preview.
                    </audio>
                  )}
                </div>
              )}


              {soundMode === "default" && (
                <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  The sound will be generated by XRPWeb
                  according to the emotion name and ID.
                </div>
              )}


              {soundMode === "none" && (
                <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  No sound will play when this emotion
                  becomes active.
                </div>
              )}
            </section>


            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <h2 className="mb-4 font-semibold">
                Preview
              </h2>

              <EmotionSpritePreview
                imageUrl={spriteUrl}
                frameWidth={
                  calculatedFrameWidth
                }
                frameHeight={
                  calculatedFrameHeight
                }
                frameCount={
                  frameCount
                }
                fps={defaultFps}
              />
            </section>


            {errorMessage && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            {statusMessage && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                {statusMessage}
              </div>
            )}


            <div className="flex flex-wrap gap-3">
              <div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : editingUniqueName
                      ? "Update emotion"
                      : "Save emotion"}
                </button>
              </div>
            </div>
          </form>


          <aside className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Saved emotions
              </h2>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Stored locally in this browser.
              </p>
            </div>

            {customEmotions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-400 p-8 text-center text-sm text-slate-500 dark:border-slate-600">
                No custom emotions saved yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {customEmotions.map(
                  (record) => (
                    <article
                      key={
                        record.uniqueName
                      }
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <StoredEmotionPreview
                        emotion={record}
                      />

                      <div className="mt-3">
                        <div className="font-semibold">
                          {
                            record.displayName
                          }
                        </div>

                        <div className="font-semibold">
                          {record.displayName}
                        </div>

                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {record.frameCount} frames ·{" "}
                          {record.defaultFps} FPS ·{" "}
                          {record.repeatMode}
                        </div>

                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {
                            record.frameCount
                          }{" "}
                          frames ·{" "}
                          {
                            record.defaultFps
                          }{" "}
                          FPS ·{" "}
                          {
                            record.repeatMode
                          }
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleEdit(
                              record
                            );
                          }}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleDelete(
                              record
                            );
                          }}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </aside>
        </div>


        <footer className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2 font-semibold hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
    </Dialog>
  );
}


export default ManageEmotionsDialog;