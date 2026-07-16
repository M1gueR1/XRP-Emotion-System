import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  OFFICIAL_EMOTION_NAMES,
} from "./officialEmotionCatalog";

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

import {
  deleteCustomEmotionFromRedVision,
  releaseExistingUsbConnectionForRedVisionUpload,
  uploadCustomEmotionToRedVision,
} from "./xrpRedVisionUploadService";

import {
  normalizeCustomEmotionAnimationConfiguration,
} from "./customEmotionAnimationConfig";

import {
  CUSTOM_EMOTION_FRAME_SIZE_OPTIONS,
  type CustomEmotionSourceMode,
  type CustomEmotionTargetFrameSize,
  processCustomEmotionImage,
} from "./customEmotionImageProcessor";

type UploadFeedback = {
  emotionName: string;
  tone: "progress" | "success" | "error";
  message: string;
  percent?: number;
};

const SAVED_EMOTION_BORDER_COLORS = [
  "#fb923c",
  "#c084fc",
  "#22d3ee",
  "#34d399",
] as const;

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

const MIN_CUSTOM_FRAMES = 1;
const MAX_CUSTOM_FRAMES = 1024;

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 1024;


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



function clampInteger(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const rounded =
    Math.round(value);

  return Math.min(
    maximum,
    Math.max(
      minimum,
      rounded
    )
  );
}


function isSupportedImageFile(
  file: File
): boolean {
  if (
    file.type.startsWith(
      "image/"
    )
  ) {
    return true;
  }

  return /\.(png|jpe?g|webp)$/i.test(
    file.name
  );
}


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
    OFFICIAL_EMOTION_NAMES.has(
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
    sourceImageFile,
    setSourceImageFile,
  ] = useState<File | null>(
    null
  );

  const [
    sourceMode,
    setSourceMode,
  ] = useState<
    CustomEmotionSourceMode
  >("single_image");

  const [
    targetFrameSize,
    setTargetFrameSize,
  ] = useState<
    CustomEmotionTargetFrameSize
  >(64);

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
  ] = useState(1);

  const [
    gridRows,
    setGridRows,
  ] = useState(1);

  const [
    gridColumns,
    setGridColumns,
  ] = useState(1);

  const [
    defaultFps,
    setDefaultFps,
  ] = useState(1);

  const [
    repeatMode,
    setRepeatMode,
  ] =
    useState<
      CustomEmotionRepeatMode
    >("once");

  const [
    repeatCount,
    setRepeatCount,
  ] = useState(1);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    uploadingEmotionName,
    setUploadingEmotionName,
  ] = useState<string | null>(
    null
  );

  const [
    deletingEmotionName,
    setDeletingEmotionName,
  ] = useState<string | null>(null);

  const [uploadFeedback, setUploadFeedback] =
    useState<UploadFeedback | null>(null);

  const [showDeleteSuccessDialog, setShowDeleteSuccessDialog] =
    useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const animationConfiguration =
    normalizeCustomEmotionAnimationConfiguration({
      sourceMode,
      frameCount,
      repeatMode,
      repeatCount,
    });

  const effectiveFrameCount =
    animationConfiguration.frameCount;
  const effectiveRepeatMode =
    animationConfiguration.repeatMode;
  const effectiveDefaultFps =
    sourceMode === "single_image" ? 1 : defaultFps;
  const isBoardOperationActive =
    uploadingEmotionName !== null ||
    deletingEmotionName !== null;

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
      effectiveFrameCount > 0 &&
      sheetWidth % effectiveFrameCount === 0
    )
      ? sheetWidth / effectiveFrameCount
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
        setSourceImageFile(null);
        setSourceMode("single_image");
        setSheetWidth(0);
        setSheetHeight(0);

        setFrameCount(1);
        setGridRows(1);
        setGridColumns(1);
        setDefaultFps(1);

        setRepeatMode("once");
        setRepeatCount(1);

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
    setUploadFeedback(null);
  }, [
    isOpen,
    refreshEmotionList,
    resetForm,
  ]);


  useEffect(() => {
    if (!sourceImageFile) {
      return;
    }

    let cancelled = false;

    async function processImage() {
      try {
        setErrorMessage("");

        const processed =
          await processCustomEmotionImage({
            file: sourceImageFile!,
            frameCount: effectiveFrameCount,
            sourceMode,
            gridRows,
            gridColumns,
            fitMode: "contain",
            targetFrameSize,
            background: "transparent",
          });

        if (cancelled) {
          return;
        }

        setSpriteBlob(
          processed.spriteBlob
        );

        setSheetWidth(
          processed.width
        );

        setSheetHeight(
          processed.height
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSpriteBlob(null);
        setSheetWidth(0);
        setSheetHeight(0);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    }

    void processImage();

    return () => {
      cancelled = true;
    };
  }, [
    sourceImageFile,
    effectiveFrameCount,
    sourceMode,
    gridRows,
    gridColumns,
    targetFrameSize,
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

    if (!isSupportedImageFile(file)) {
      setErrorMessage(
        "Select a valid image file: PNG, JPG, JPEG or WebP."
      );

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setErrorMessage(
        "The selected image file is empty."
      );

      event.target.value = "";
      return;
    }

    setSourceImageFile(file);

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
        "Select an image. It will be converted to 64×64 frames automatically."
      );

      return;
    }

    if (
      sheetWidth <= 0 ||
      sheetHeight <= 0
    ) {
      setErrorMessage(
        "The processed image dimensions are unavailable."
      );

      return;
    }

    if (
      effectiveFrameCount <= 0 ||
      !Number.isInteger(
        effectiveFrameCount
      )
    ) {
      setErrorMessage(
        "Frame count must be a positive integer."
      );

      return;
    }

    if (
      sourceMode === "grid_spritesheet" &&
      gridRows * gridColumns < effectiveFrameCount
    ) {
      setErrorMessage(
        "Grid rows × columns must be greater than or equal to total frames."
      );

      return;
    }

    if (
      sheetWidth % effectiveFrameCount !== 0
    ) {
      setErrorMessage(
        "The processed image width must be divisible " +
        "by the frame count."
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

        frameCount: effectiveFrameCount,
        defaultFps: effectiveDefaultFps,

        repeatMode: effectiveRepeatMode,

        repeatCount:
          effectiveRepeatMode === "count"
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

    setSourceImageFile(null);
    setSourceMode(
      "horizontal_spritesheet"
    );

    setGridRows(1);

    setGridColumns(
      record.frameCount
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
      record.repeatMode === "count"
        ? record.repeatCount ?? 1
        : 1
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


  const handleUploadToXrpRedVision =
    async (
      record:
        CustomEmotionRecord
    ) => {
      setUploadFeedback({
        emotionName: record.uniqueName,
        tone: "progress",
        message: "Preparing Red Vision upload...",
        percent: 0,
      });
      setErrorMessage("");
      setStatusMessage("");

      try {
        setUploadingEmotionName(
          record.uniqueName
        );

        await uploadCustomEmotionToRedVision(
          record,
          {
            onProgress: (progress) => {
              setUploadFeedback({
                emotionName: record.uniqueName,
                tone: progress.stage === "done"
                  ? "success"
                  : "progress",
                message: progress.message,
                percent: progress.totalBytes > 0
                  ? Math.round(
                      (progress.sentBytes / progress.totalBytes) * 100
                    )
                  : 0,
              });
            },
          }
        );

        setUploadFeedback({
          emotionName: record.uniqueName,
          tone: "success",
          message: "Uploaded to XRP Red Vision.",
          percent: 100,
        });
      } catch (error) {
        setUploadFeedback({
          emotionName: record.uniqueName,
          tone: "error",
          message: error instanceof Error
            ? error.message
            : String(error),
        });
      } finally {
        setUploadingEmotionName(null);
      }
    };


  const handleDisconnectXrpUsb =
    async () => {
      setErrorMessage("");
      setStatusMessage("");
      setStatusMessage("Disconnecting XRP USB...");

      try {
        const released =
          await releaseExistingUsbConnectionForRedVisionUpload();

        setStatusMessage(
          released
            ? "XRP USB disconnected."
            : "No active XRP USB connection to disconnect."
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    };


  const handleDelete = async (
    record:
      CustomEmotionRecord
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${record.displayName}" from this browser and ` +
        "from /emotion_sheets_custom on the XRP? " +
        "You will be asked to select the XRP USB serial port."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEmotionName(record.uniqueName);
      setErrorMessage("");
      setStatusMessage(
        "Removing emotion from XRP Red Vision..."
      );

      await deleteCustomEmotionFromRedVision(
        record.uniqueName,
        {
          onProgress: (message) => {
            setStatusMessage(message);
          },
        }
      );

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

      setStatusMessage("");
      setShowDeleteSuccessDialog(true);

      if (
        uploadFeedback?.emotionName ===
        record.uniqueName
      ) {
        setUploadFeedback(null);
      }

      notifyChanged();
    } catch (error) {
      setStatusMessage("");
      setErrorMessage(
        error instanceof Error
          ? error.message
        : String(error)
      );
    } finally {
      setDeletingEmotionName(null);
    }
  };


  return (
    <>
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
              Upload any image, horizontal
              spritesheet or grid spritesheet.
              XRPWeb converts it to dashboard
              frames automatically.
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
            <section
              className="rounded-xl border p-4"
              style={{ borderColor: "#38bdf8" }}
            >
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
                    Image or spritesheet

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
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


            <section
              className="rounded-xl border p-4"
              style={{ borderColor: "#c084fc" }}
            >
              <h2 className="mb-4 font-semibold">
                Animation configuration
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Source type

                  <select
                    value={sourceMode}
                    onChange={(event) => {
                      const nextSourceMode =
                        event.target.value as
                          CustomEmotionSourceMode;

                      setSourceMode(nextSourceMode);

                      if (nextSourceMode === "single_image") {
                        setFrameCount(1);
                        setDefaultFps(1);
                        setRepeatMode("once");
                        setRepeatCount(1);
                      }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                  >
                    <option value="single_image">
                      Single image
                    </option>

                    <option value="horizontal_spritesheet">
                      Horizontal spritesheet
                    </option>

                    <option value="grid_spritesheet">
                      Grid spritesheet
                    </option>
                  </select>

                  <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Single image repeats one converted
                    frame. Horizontal spritesheet splits
                    one row. Grid spritesheet uses rows,
                    columns and total frames.
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Output frame size

                  <select
                    value={targetFrameSize}
                    onChange={(event) => {
                      setTargetFrameSize(
                        Number(
                          event.target.value
                        ) as
                          CustomEmotionTargetFrameSize
                      );
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                  >
                    {CUSTOM_EMOTION_FRAME_SIZE_OPTIONS.map(
                      (size) => (
                        <option
                          key={size}
                          value={size}
                        >
                          {size}×{size}
                        </option>
                      )
                    )}
                  </select>

                  <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    64×64 is lightest. 128×128 gives
                    more detail. 192×192 matches the
                    Red Vision face size, but it is
                    stored for dashboard use only.
                  </span>
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Total frames

                  <input
                    type="number"
                    min={MIN_CUSTOM_FRAMES}
                    max={MAX_CUSTOM_FRAMES}
                    step={1}
                    value={effectiveFrameCount}
                    disabled={sourceMode === "single_image"}
                    onChange={(event) => {
                      setFrameCount(
                        clampInteger(
                          Number(
                            event.target.value
                          ),
                          MIN_CUSTOM_FRAMES,
                          MAX_CUSTOM_FRAMES,
                          1
                        )
                      );
                    }}
                    required
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"
                  />

                  <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Maximum {MAX_CUSTOM_FRAMES} frames for
                    dashboard playback.
                  </span>
                </label>

                {sourceMode === "grid_spritesheet" && (
                  <>
                    <label className="flex flex-col gap-1 text-sm">
                      Grid rows

                      <input
                        type="number"
                        min={MIN_GRID_SIZE}
                        max={MAX_GRID_SIZE}
                        step={1}
                        value={gridRows}
                        onChange={(event) => {
                          setGridRows(
                            clampInteger(
                              Number(
                                event.target.value
                              ),
                              MIN_GRID_SIZE,
                              MAX_GRID_SIZE,
                              1
                            )
                          );
                        }}
                        required
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      Grid columns

                      <input
                        type="number"
                        min={MIN_GRID_SIZE}
                        max={MAX_GRID_SIZE}
                        step={1}
                        value={gridColumns}
                        onChange={(event) => {
                          setGridColumns(
                            clampInteger(
                              Number(
                                event.target.value
                              ),
                              MIN_GRID_SIZE,
                              MAX_GRID_SIZE,
                              1
                            )
                          );
                        }}
                        required
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      />
                    </label>
                  </>
                )}

                {sourceMode !== "single_image" && (
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
                          clampInteger(
                            Number(event.target.value),
                            1,
                            60,
                            8
                          )
                        );
                      }}
                      required
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </label>
                )}

                <label className="flex flex-col gap-1 text-sm">
                    Repeat mode

                    <select
                      value={effectiveRepeatMode}
                      disabled={sourceMode === "single_image"}
                      onChange={(event) => {
                        const nextRepeatMode =
                          event.target.value as
                            CustomEmotionRepeatMode;
                        setRepeatMode(nextRepeatMode);
                        if (nextRepeatMode === "once") {
                          setRepeatCount(1);
                        }
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900"
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
                      {REPEAT_MODE_HELP[effectiveRepeatMode]}
                    </span>
                  </label>

                {sourceMode !== "single_image" &&
                  effectiveRepeatMode === "count" && (
                  <label className="flex flex-col gap-1 text-sm">
                    Repeat count

                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={repeatCount}
                      onChange={(event) => {
                        setRepeatCount(
                          clampInteger(
                            Number(event.target.value),
                            1,
                            100,
                            1
                          )
                        );
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </label>
                )}
              </div>


              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-900">
                <div>
                  Sheet size:{" "}
                  {sheetWidth > 0
                    ? `${sheetWidth} × ${sheetHeight}`
                    : "Not loaded"}
                </div>

                <div>
                  Output frame size:{" "}
                  {targetFrameSize} × {targetFrameSize}
                </div>

                {sourceMode === "grid_spritesheet" && (
                  <div>
                    Source grid:{" "}
                    {gridRows} rows × {gridColumns} columns
                    · {effectiveFrameCount} used frames
                  </div>
                )}

                <div>
                  Calculated frame size:{" "}
                  {calculatedFrameWidth > 0
                    ? `${calculatedFrameWidth} × ${calculatedFrameHeight}`
                    : "Invalid or unavailable"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  The saved dashboard sprite is always
                  processed into one horizontal row,
                  even if the uploaded source is a grid.
                </div>
              </div>
            </section>


            <section
              className="rounded-xl border p-4"
              style={{ borderColor: "#34d399" }}
            >
              <h2 className="font-semibold">
                Emotion sound
              </h2>

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


              {soundMode === "none" && (
                <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  No sound will play when this emotion
                  becomes active.
                </div>
              )}
            </section>


            <section
              className="rounded-xl border p-4"
              style={{ borderColor: "#fbbf24" }}
            >
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
                  effectiveFrameCount
                }
                fps={effectiveDefaultFps}
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

              <button
                type="button"
                onClick={() => {
                  void handleDisconnectXrpUsb();
                }}
                disabled={
                  isBoardOperationActive
                }
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Disconnect XRP USB
              </button>
            </div>

            {customEmotions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-400 p-8 text-center text-sm text-slate-500 dark:border-slate-600">
                No custom emotions saved yet.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {customEmotions.map(
                  (record, recordIndex) => (
                    <article
                      key={
                        record.uniqueName
                      }
                      className="rounded-xl border p-4"
                      style={{
                        borderColor:
                          SAVED_EMOTION_BORDER_COLORS[
                            recordIndex %
                              SAVED_EMOTION_BORDER_COLORS.length
                          ],
                      }}
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

                      <div className="mt-3 grid gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void handleUploadToXrpRedVision(
                              record
                            );
                          }}
                          disabled={
                            isBoardOperationActive
                          }
                          className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploadingEmotionName ===
                          record.uniqueName
                            ? "Uploading to XRP..."
                            : "Upload to XRP Red Vision"}
                        </button>

                        {uploadFeedback?.emotionName ===
                          record.uniqueName && (
                          <div
                            className={`rounded-lg border p-3 text-sm ${
                              uploadFeedback.tone === "success"
                                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                                : uploadFeedback.tone === "error"
                                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                                  : "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                            role="status"
                          >
                            {uploadFeedback.message}

                            {uploadFeedback.tone === "progress" && (
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
                                <div
                                  className="h-full rounded-full bg-blue-600 transition-[width]"
                                  style={{
                                    width: `${uploadFeedback.percent ?? 0}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleEdit(
                                record
                              );
                            }}
                            disabled={isBoardOperationActive}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
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
                            disabled={isBoardOperationActive}
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            {deletingEmotionName === record.uniqueName
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
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

      <Dialog
        isOpen={showDeleteSuccessDialog}
        toggleDialog={() => setShowDeleteSuccessDialog(false)}
      >
        <div className="grid w-[min(90vw,430px)] gap-4 rounded-xl border border-emerald-400 bg-black p-5 text-white shadow-[0_0_28px_rgba(16,185,129,0.2)]">
          <div>
            <h2 className="text-lg font-bold text-emerald-200">
              Emotion deleted
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-200">
              Deleted successfully from this browser and XRP Red Vision.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteSuccessDialog(false)}
            className="justify-self-end rounded border border-emerald-300 bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Done
          </button>
        </div>
      </Dialog>
    </>
  );
}


export default ManageEmotionsDialog;
