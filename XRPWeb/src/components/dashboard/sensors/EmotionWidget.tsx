import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import EmotionSoundManager from
  "../emotions/EmotionSoundManager";

import {
  FaRobot,
  FaTrash,
} from "react-icons/fa";

import useSensorData from "../hooks/useSensorData";

import useCustomEmotionCatalog from
  "../emotions/useCustomEmotionCatalog";

import ManageEmotionsDialog from
  "../emotions/ManageEmotionsDialog";

import Dialog from "../../dialogs/dialog";

import VoiceCommandPanel from
  "../voice/VoiceCommandPanel";

import EmotionKeywordRulesPanel from
  "./EmotionKeywordRulesPanel";



import type {
  VoiceCommandAction,
  VoiceCommandResult,
} from "../voice/useVoiceCommands";

import {
  sendVoiceRuntimeCommandToXrp,
} from "../voice/voiceCommandRobotService";

import type {
  EmotionData,
} from "../utils/sensorParsers";

import SensorCard from "./SensorCard";

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  getEmotionById,
} from "./emotionCatalog";


const DISPLAY_SCALE = 3;
const MAX_FACE_DISPLAY_SIZE = 192;

const REPEAT_DEFAULT = 0;
const REPEAT_ONCE = 1;
const REPEAT_LOOP = 2;
const REPEAT_COUNT = 3;
const REPEAT_PING_PONG = 4;

const VOICE_HAPPY_EMOTION_ID = 1;
const VOICE_EXCITED_EMOTION_ID = 3;
const VOICE_SAD_EMOTION_ID = 9;
const VOICE_IN_LOVE_EMOTION_ID = 12;
const VOICE_IDLE_EMOTION_ID = 0;

const VOICE_UPSET_EMOTION_ID = 8;

const DASHBOARD_IDLE_EMOTION_ID = 0;
const DASHBOARD_HAPPY_EMOTION_ID = 1;
const DASHBOARD_SAD_EMOTION_ID = 9;

const DASHBOARD_FPS_OVERRIDES: Record<
  number,
  number
> = {
  [DASHBOARD_IDLE_EMOTION_ID]: 55,
  [DASHBOARD_HAPPY_EMOTION_ID]: 25,
  [DASHBOARD_SAD_EMOTION_ID]: 20,
};


const unpackFrameSubset = (
  length: number,
  packedValue: number
): number[] => {
  if (length <= 0) {
    return [];
  }

  const safeLength = Math.min(
    length,
    8
  );

  const unsignedPacked =
    packedValue >>> 0;

  const frames: number[] = [];

  for (
    let position = 0;
    position < safeLength;
    position += 1
  ) {
    frames.push(
      (
        unsignedPacked >>>
        (position * 4)
      ) & 0x0f
    );
  }

  return frames;
};


const buildPingPongSequence = (
  frames: number[]
): number[] => {
  if (frames.length <= 1) {
    return frames;
  }

  return [
    ...frames,
    ...frames
      .slice(1, -1)
      .reverse(),
  ];
};


const EmotionWidget: React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

  const {
    getSensorData,
    requestSensors,
    stopSensor,
  } = useSensorData();

  const {
  customEmotionById,
} = useCustomEmotionCatalog();

const soundManagerRef =
  useRef<
    EmotionSoundManager | null
  >(null);

if (
  soundManagerRef.current === null
) {
  soundManagerRef.current =
    new EmotionSoundManager();
}


const [
  emotionSoundsEnabled,
  setEmotionSoundsEnabled,
] = useState(false);


const [
  emotionSoundVolume,
  setEmotionSoundVolume,
] = useState(0.35);

const [
  isSoundVolumeOpen,
  setSoundVolumeOpen,
] = useState(false);


const [
  emotionSoundError,
  setEmotionSoundError,
] = useState("");


const lastSoundEventRef =
  useRef<string | null>(null);

const suppressNextAutoSoundRef =
  useRef(false);

  const [
  isEmotionManagerOpen,
  setEmotionManagerOpen,
] = useState(false);

  const robotEmotion =
    getSensorData<EmotionData>(
      "emotion"
    );


  const [
    sequencePosition,
    setSequencePosition,
  ] = useState(0);

  const [
    completedCycles,
    setCompletedCycles,
  ] = useState(0);

  const [
    ,
    setAnimationFinished,
  ] = useState(false);

  const [localPlaying, setLocalPlaying] =
    useState(true);

  const [
    voiceEmotionId,
    setVoiceEmotionId,
  ] = useState<number | null>(
    null
  );

  const [
    voiceEmotionGeneration,
    setVoiceEmotionGeneration,
  ] = useState(0);

  const [
    voicePreviewEnabled,
    setVoicePreviewEnabled,
  ] = useState(false);

  const [
    showEmotionKeywordOptions,
    setShowEmotionKeywordOptions,
  ] = useState(false);


  const lastRobotEmotionEventRef =
    useRef<string | null>(null);

  const lastForwardedVoiceEmotionIdRef =
    useRef<number | null>(null);

  const lastForwardedVoiceEmotionAtRef =
    useRef(0);

  const [lastUpdated, setLastUpdated] =
    useState(
      new Date().toISOString()
    );

  useEffect(() => {
    soundManagerRef.current
      ?.setVolume(
        emotionSoundVolume
      );
  }, [emotionSoundVolume]);


  useEffect(() => {
    const manager =
      soundManagerRef.current;

    return () => {
      void manager?.close();
    };
  }, []);

  useEffect(() => {
    requestSensors(["emotion"]);

    return () => {
      stopSensor("emotion");
    };

    // The hook exposes stable behavior for this
    // subscription during the widget lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Clear the temporary voice dashboard preview as soon
   * as a real robot emotion event arrives.
   *
   * Without this, after saying "turn happy" or "turn sad",
   * voiceEmotionId stayed set forever and the widget kept
   * ignoring XPP emotion updates from MicroPython.
   */
  useEffect(() => {
    if (!robotEmotion) {
      return;
    }

    const eventKey = [
      robotEmotion.emotionGeneration,
      robotEmotion.emotionId,
      robotEmotion.emotionStatus,
    ].join(":");

    if (
      lastRobotEmotionEventRef.current ===
      null
    ) {
      lastRobotEmotionEventRef.current =
        eventKey;

      return;
    }

    if (
      lastRobotEmotionEventRef.current ===
      eventKey
    ) {
      return;
    }

    lastRobotEmotionEventRef.current =
      eventKey;

    setVoiceEmotionId(null);

    lastForwardedVoiceEmotionIdRef.current =
      null;

    lastForwardedVoiceEmotionAtRef.current =
      0;
  }, [
    robotEmotion?.emotionGeneration,
    robotEmotion?.emotionId,
    robotEmotion?.emotionStatus,
  ]);

  const usingRobotData =
    robotEmotion !== null;

  const voiceOverrideActive =
    voiceEmotionId !== null;

  const activeEmotionId =
    voiceEmotionId ??
    robotEmotion?.emotionId ??
    0;

  const officialConfig =
  getEmotionById(
    activeEmotionId
  );

const customConfig =
  customEmotionById.get(
    activeEmotionId
  );

const config =
  customConfig ??
  officialConfig;

  const generation =
    voiceOverrideActive
      ? voiceEmotionGeneration
      : robotEmotion?.emotionGeneration ?? 0;

  const robotPlaybackFps =
    !voiceOverrideActive &&
    robotEmotion &&
    robotEmotion.emotionFps > 0
      ? robotEmotion.emotionFps
      : null;

  const catalogPlaybackFps =
    config?.fps ?? 4;

  /*
   * Dashboard-only FPS overrides.
   *
   * Blockly programs can publish FPS values that are
   * lower than the local dashboard catalog. Red Vision
   * should keep using the XRP-side timing, but the
   * dashboard animation can stay visually fluid for
   * selected official emotions.
   */
  const dashboardFpsOverride =
    DASHBOARD_FPS_OVERRIDES[
      activeEmotionId
    ];

  const playbackFps =
    dashboardFpsOverride ??
    robotPlaybackFps ??
    catalogPlaybackFps;

  const catalogRepeatMode =
  customConfig?.repeatModeId ??
  REPEAT_DEFAULT;

const receivedRepeatMode =
  !voiceOverrideActive
    ? robotEmotion?.emotionRepeatMode ??
      REPEAT_DEFAULT
    : REPEAT_DEFAULT;

const repeatMode =
  receivedRepeatMode !==
    REPEAT_DEFAULT
    ? receivedRepeatMode
    : catalogRepeatMode;

  const catalogRepeatCount =
  customConfig?.repeatCount ??
  -1;

const receivedRepeatCount =
  !voiceOverrideActive
    ? robotEmotion?.emotionRepeatCount ??
      -1
    : -1;

const repeatCount =
  receivedRepeatCount >= 0
    ? receivedRepeatCount
    : catalogRepeatCount;

  const emotionNameForSound =
  config.name;

  const activeSoundMode =
    customConfig?.soundMode ??
    "default";

  const activeSoundBlob =
    customConfig?.soundBlob ??
    null;


  const frameSubset = useMemo(() => {
    if (!config) {
      return [];
    }

    if (
      !voiceOverrideActive &&
      usingRobotData &&
      robotEmotion &&
      robotEmotion
        .emotionFrameSubsetLength > 0
    ) {
      const receivedFrames =
        unpackFrameSubset(
          robotEmotion
            .emotionFrameSubsetLength,
          robotEmotion
            .emotionFrameSubsetPacked
        ).filter(
          (frameIndex) =>
            frameIndex >= 0 &&
            frameIndex <
              config.frameCount
        );

      if (receivedFrames.length > 0) {
        return receivedFrames;
      }
    }

    return Array.from(
      {
        length: config.frameCount,
      },
      (_, index) => index
    );
  }, [
    config,
    robotEmotion,
    usingRobotData,
    voiceOverrideActive,
  ]);

  const playbackSequence =
    useMemo(() => {
      if (
        repeatMode ===
        REPEAT_PING_PONG
      ) {
        return buildPingPongSequence(
          frameSubset
        );
      }

      return frameSubset;
    }, [
      frameSubset,
      repeatMode,
    ]);

  const finiteCycleLimit =
    useMemo(() => {
      if (
        repeatMode === REPEAT_ONCE
      ) {
        return 1;
      }

      if (
        repeatMode === REPEAT_COUNT
      ) {
        return Math.max(
          repeatCount,
          1
        );
      }

      return null;
    }, [
      repeatCount,
      repeatMode,
    ]);

  const robotIsPlaying =
    voiceOverrideActive ||
    robotEmotion?.emotionStatus === 1;

  const robotShouldAnimate =
    voiceOverrideActive ||
    robotIsPlaying ||
    config.name === "idle";

  useEffect(() => {
    if (
      !emotionSoundsEnabled ||
      !robotIsPlaying
    ) {
      return;
    }

    const soundEventKey =
      `${generation}:${activeEmotionId}`;

    if (suppressNextAutoSoundRef.current) {
      suppressNextAutoSoundRef.current =
        false;

      lastSoundEventRef.current =
        soundEventKey;

      return;
    }

    if (
      lastSoundEventRef.current ===
      soundEventKey
    ) {
      return;
    }

    lastSoundEventRef.current =
      soundEventKey;

    const manager =
      soundManagerRef.current;

    if (!manager) {
      return;
    }

    let cancelled = false;

    const playSound =
      async (): Promise<void> => {
        let played = true;

        if (
          activeSoundMode === "none"
        ) {
          manager.stop();
          return;
        }

        if (
          activeSoundMode === "custom" &&
          activeSoundBlob !== null
        ) {
          played =
            await manager.playCustomAudio(
              activeSoundBlob
            );
        } else {
          played =
            manager.playEmotion({
              emotionId:
                activeEmotionId,

              emotionName:
                emotionNameForSound,
            });
        }

        if (
          !cancelled &&
          played === false
        ) {
          setEmotionSoundError(
            "The browser could not play " +
              "the emotion sound."
          );
        }
      };

    void playSound();

    return () => {
      cancelled = true;
    };
  }, [
    activeEmotionId,
    activeSoundBlob,
    activeSoundMode,
    emotionNameForSound,
    emotionSoundsEnabled,
    generation,
    robotIsPlaying,
  ]);

  const isPlaying =
    voiceOverrideActive
      ? true
      : usingRobotData
        ? robotShouldAnimate
        : localPlaying;

  useEffect(() => {
      if (
        usingRobotData &&
        !robotIsPlaying
      ) {
        soundManagerRef.current
          ?.stop();
      }
    }, [
      robotIsPlaying,
      usingRobotData,
    ]);

  useEffect(() => {
    setSequencePosition(0);
    setCompletedCycles(0);
    setAnimationFinished(false);

    setLastUpdated(
      new Date().toISOString()
    );
  }, [
    activeEmotionId,
    generation,
    repeatMode,
    repeatCount,
    playbackSequence.length,
  ]);

  useEffect(() => {
    if (
      !config ||
      !isPlaying ||
      playbackSequence.length === 0 ||
      playbackFps <= 0
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          setSequencePosition(
            (currentPosition) => {
              const nextPosition =
                currentPosition + 1;

              if (
                nextPosition <
                playbackSequence.length
              ) {
                return nextPosition;
              }

              const nextCycles =
                completedCycles + 1;

              if (
                finiteCycleLimit !== null &&
                nextCycles >=
                  finiteCycleLimit
              ) {
                setCompletedCycles(
                  finiteCycleLimit
                );
                setAnimationFinished(
                  true
                );

                return Math.max(
                  playbackSequence.length -
                    1,
                  0
                );
              }

              setCompletedCycles(
                nextCycles
              );

              return 0;
            }
          );
        },
        1000 / playbackFps
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [
    completedCycles,
    config,
    finiteCycleLimit,
    isPlaying,
    playbackFps,
    playbackSequence.length,
  ]);


  const applyDashboardVoiceEmotion =
    (emotionId: number): void => {
      setVoiceEmotionId(
        emotionId
      );

      setVoiceEmotionGeneration(
        (current) => current + 1
      );

      setLocalPlaying(true);
      setSequencePosition(0);
      setCompletedCycles(0);
      setAnimationFinished(false);

      setLastUpdated(
        new Date().toISOString()
      );
    };


  useEffect(() => {
    const handleCameraEmotionPreview = (
      event: Event
    ): void => {
      const detail = (
        event as CustomEvent<{
          emotionId?: number;
        }>
      ).detail;

      if (
        typeof detail?.emotionId !==
        "number"
      ) {
        return;
      }

      applyDashboardVoiceEmotion(
        detail.emotionId
      );
    };

    window.addEventListener(
      "xrp:dashboard-emotion-preview",
      handleCameraEmotionPreview
    );

    return () => {
      window.removeEventListener(
        "xrp:dashboard-emotion-preview",
        handleCameraEmotionPreview
      );
    };

    // Camera preview events only use React state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const playRepeatedVoiceEmotionSound =
    async (
      emotionId: number,
      repeatCount: number
    ): Promise<void> => {
      if (!emotionSoundsEnabled) {
        return;
      }

      const manager =
        soundManagerRef.current;

      if (!manager) {
        return;
      }

      const emotionConfig =
        customEmotionById.get(
          emotionId
        ) ??
        getEmotionById(
          emotionId
        );

      if (!emotionConfig) {
        return;
      }

      const safeRepeatCount =
        Math.min(
          Math.max(
            repeatCount,
            1
          ),
          3
        );

      for (
        let index = 0;
        index < safeRepeatCount;
        index += 1
      ) {
        manager.playEmotion({
          emotionId,
          emotionName:
            emotionConfig.name,
        });

        if (
          index <
          safeRepeatCount - 1
        ) {
          await new Promise(
            (resolve) => {
              window.setTimeout(
                resolve,
                350
              );
            }
          );
        }
      }
    };


  const shouldForwardEmotionCommandToXrp =
    (emotionId: number): boolean => {
      const now =
        Date.now();

      const alreadyForwardedRecently =
        lastForwardedVoiceEmotionIdRef.current ===
          emotionId &&
        now -
          lastForwardedVoiceEmotionAtRef.current <
          1200;

      /*
       * If the dashboard already shows this emotion,
       * do not send the same command to the XRP again.
       * This prevents unnecessary Red Vision updates.
       */
      if (
        activeEmotionId === emotionId ||
        alreadyForwardedRecently
      ) {
        console.log(
          "[voice-xrp] skipped duplicate emotion:",
          emotionId
        );

        return false;
      }

      lastForwardedVoiceEmotionIdRef.current =
        emotionId;

      lastForwardedVoiceEmotionAtRef.current =
        now;

      return true;
    };


  const handleEmotionVoiceCommand =
    async (
      action: VoiceCommandAction,
      emotionId: number,
      result?: VoiceCommandResult,
      options: {
        forceDashboardPreview?: boolean;
        skipRuntimeCommand?: boolean;
      } = {}
    ): Promise<void> => {
      const safeRepeatCount =
        Math.min(
          Math.max(
            result?.repeatCount ?? 1,
            1
          ),
          3
        );

      const shouldForwardToXrp =
        shouldForwardEmotionCommandToXrp(
          emotionId
        );

      const shouldPulseDashboard =
        options.forceDashboardPreview ||
        voicePreviewEnabled ||
        activeEmotionId === emotionId ||
        safeRepeatCount > 1;

      if (shouldPulseDashboard) {
        if (emotionSoundsEnabled) {
          suppressNextAutoSoundRef.current =
            true;
        }

        applyDashboardVoiceEmotion(
          emotionId
        );
      }

      void playRepeatedVoiceEmotionSound(
        emotionId,
        safeRepeatCount
      );

      if (
        !shouldForwardToXrp ||
        options.skipRuntimeCommand
      ) {
        return;
      }

      await sendVoiceRuntimeCommandToXrp(
        action
      );
    };


  const handleDashboardVoiceCommand =
    async (
      action: VoiceCommandAction,
      result?: VoiceCommandResult
    ): Promise<void> => {
      console.log(
        "[voice-panel] command:",
        action
      );

      if (action === "turn_idle") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_IDLE_EMOTION_ID,
          result,
          {
            forceDashboardPreview: true,
            skipRuntimeCommand: true,
          }
        );

        return;
      }

      if (action === "turn_upset") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_UPSET_EMOTION_ID,
          result,
          {
            forceDashboardPreview: true,
            skipRuntimeCommand: true,
          }
        );

        return;
      }

      if (action === "turn_happy") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_HAPPY_EMOTION_ID,
          result
        );

        return;
      }

      if (action === "turn_excited") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_EXCITED_EMOTION_ID,
          result
        );

        return;
      }

      if (action === "turn_in_love") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_IN_LOVE_EMOTION_ID,
          result
        );

        return;
      }

      if (action === "turn_sad") {
        await handleEmotionVoiceCommand(
          action,
          VOICE_SAD_EMOTION_ID,
          result
        );

        return;
      }

      if (action === "go_to_sleep") {
        if (voicePreviewEnabled) {
          applyDashboardVoiceEmotion(
            VOICE_SAD_EMOTION_ID
          );
        }

        await sendVoiceRuntimeCommandToXrp(
          action
        );

        return;
      }

      if (action === "showtime") {
        if (voicePreviewEnabled) {
          applyDashboardVoiceEmotion(
            VOICE_EXCITED_EMOTION_ID
          );
        }

        await sendVoiceRuntimeCommandToXrp(
          action
        );

        return;
      }

      if (action === "lets_play") {
        if (voicePreviewEnabled) {
          applyDashboardVoiceEmotion(
            VOICE_EXCITED_EMOTION_ID
          );
        }

        await sendVoiceRuntimeCommandToXrp(
          action
        );

        return;
      }

      if (action === "stop") {
        if (voicePreviewEnabled) {
          applyDashboardVoiceEmotion(
            VOICE_SAD_EMOTION_ID
          );
        }

        await sendVoiceRuntimeCommandToXrp(
          action
        );

        return;
      }

      if (
        action === "turn_right" ||
        action === "turn_left" ||
        action === "turn_back"
      ) {
        await sendVoiceRuntimeCommandToXrp(
          action
        );

        return;
      }
    };


  const toggleEmotionSounds =
      async (): Promise<void> => {
        const manager =
          soundManagerRef.current;

        if (!manager) {
          return;
        }

        if (emotionSoundsEnabled) {
          manager.stop();

          setEmotionSoundsEnabled(
            false
          );

          setEmotionSoundError("");

          return;
        }

        const enabled =
          await manager.enable();

        if (!enabled) {
          setEmotionSoundError(
            "The browser could not enable audio."
          );

          return;
        }

        manager.setVolume(
          emotionSoundVolume
        );

        setEmotionSoundsEnabled(true);
        setEmotionSoundError("");

        /*
        * Mark the current event as handled and play
        * it once immediately after the user click.
        */
        lastSoundEventRef.current =
          `${generation}:${activeEmotionId}`;

        if (robotIsPlaying) {
          if (
            activeSoundMode === "none"
          ) {
            manager.stop();
          } else if (
            activeSoundMode === "custom" &&
            activeSoundBlob !== null
          ) {
            void manager.playCustomAudio(
              activeSoundBlob
            );
          } else {
            manager.playEmotion({
              emotionId:
                activeEmotionId,

              emotionName:
                emotionNameForSound,
            });
          }
        }
      };



  if (!config) {
    return (
      <SensorCard
        title="Emotion Face"
        icon={<FaRobot />}
        onStart={() => {}}
        onStop={() => {}}
        isConnected={usingRobotData}
        lastUpdated={lastUpdated}
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-black p-4">
          <FaRobot className="text-6xl text-cyan-400" />

          <div className="text-xl font-bold text-white">
            Idle
          </div>

          <div className="text-xs text-slate-400">
            Waiting for an emotion
          </div>
        </div>
      </SensorCard>
    );
  }

  const currentFrameIndex =
    playbackSequence[
      sequencePosition
    ] ?? 0;

  const visualScale =
    Math.min(
      DISPLAY_SCALE,
      MAX_FACE_DISPLAY_SIZE /
        Math.max(
          config.frameWidth,
          config.frameHeight,
          1
        )
    );

  const faceWidth =
    config.frameWidth *
    visualScale;

  const faceHeight =
    config.frameHeight *
    visualScale;

  const sheetWidth =
    config.frameWidth *
    config.frameCount *
    visualScale;

  const sheetHeight =
    config.frameHeight *
    visualScale;

  const backgroundX =
    currentFrameIndex *
    config.frameWidth *
    visualScale;

  const repeatLabel = (() => {
    switch (repeatMode) {
      case REPEAT_ONCE:
        return "Once";

      case REPEAT_LOOP:
        return "Loop";

      case REPEAT_COUNT:
        return `Count ${Math.max(
          repeatCount,
          1
        )}`;

      case REPEAT_PING_PONG:
        return "Ping-pong";

      default:
        return "Default";
    }
  })();

  return (
    <SensorCard
      title="Emotion Face"
      icon={<FaRobot />}
      onStart={() => {
        if (!usingRobotData) {
          setLocalPlaying(true);
          setAnimationFinished(false);
        }
      }}
      onStop={() => {
        if (!usingRobotData) {
          setLocalPlaying(false);
        }
      }}
      isConnected={usingRobotData}
      lastUpdated={lastUpdated}
    >
      <div className="absolute right-4 top-4">
        <button
          onClick={handleDelete}
          className="rounded border border-red-400 bg-black p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
        <div className="flex min-h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-black shadow-inner">
          <div
            role="img"
            aria-label={
              `${config.label} robot face`
            }
            style={{
              width: `${faceWidth}px`,
              height: `${faceHeight}px`,
              backgroundImage:
                `url("${config.imagePath}")`,
              backgroundRepeat:
                "no-repeat",
              backgroundSize:
                `${sheetWidth}px ` +
                `${sheetHeight}px`,
              backgroundPosition:
                `-${backgroundX}px 0px`,
              imageRendering:
                "pixelated",
            }}
          />
        </div>

        <div className="text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {config.label}
          </div>

          <div className="hidden">
            Sprite frame{" "}
            {currentFrameIndex + 1} ·{" "}
            {repeatLabel}
          </div>
        </div>

        

        <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-500/70 px-2 py-1.5">
          <button
            type="button"
            onClick={() => {
              setVoicePreviewEnabled(
                (current) => !current
              );
            }}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5",
              "text-xs font-bold text-white",
              "transition",
              voicePreviewEnabled
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700",
            ].join(" ")}
          >
            Emotions synced to XRP screen:{" "}
            {voicePreviewEnabled
              ? "On"
              : "Off"}
          </button>

          <button
            type="button"
            onClick={() => {
              void toggleEmotionSounds();
            }}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition",
              emotionSoundsEnabled
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700",
            ].join(" ")}
          >
            {emotionSoundsEnabled
              ? "Sound on"
              : "Enable sound"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSoundVolumeOpen(true);
            }}
            className="shrink-0 rounded-lg border border-emerald-300 bg-black px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500 hover:text-black"
          >
            Volume
          </button>
        </div>

        <VoiceCommandPanel
          onCommand={async (
            action,
            result
          ) => {
            await handleDashboardVoiceCommand(
              action,
              result
            );
          }}
        />

        <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-blue-500/70 p-2">
          <button
            type="button"
            onClick={() => {
              setShowEmotionKeywordOptions(true);
            }}
            className="rounded-lg border border-blue-300 bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500 hover:text-black"
          >
            See voice keywords
          </button>

          <button
            type="button"
            onClick={() => {
              setEmotionManagerOpen(true);
            }}
            className="rounded-lg border border-blue-300 bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-500 hover:text-black"
          >
            Manage custom emotions
          </button>
        </div>

        <Dialog
          isOpen={showEmotionKeywordOptions}
          toggleDialog={() =>
            setShowEmotionKeywordOptions(false)
          }
        >
          <div className="flex max-h-[88vh] w-[min(94vw,860px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Voice keywords
                </h2>

                <p className="mt-1 text-xs text-zinc-300">
                  Create keyword phrases that directly choose the robot emotion from voice.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEmotionKeywordOptions(false)
                }
                className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 overflow-auto pr-1">
              <EmotionKeywordRulesPanel />
            </div>
          </div>
        </Dialog>

        <div className="hidden">
          <button
            type="button"
            onClick={() => {
              void toggleEmotionSounds();
            }}
            className={[
              "rounded-lg px-3 py-2",
              "text-xs font-semibold",
              "transition",
              emotionSoundsEnabled
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-blue-600 text-white hover:bg-blue-700",
            ].join(" ")}
          >
            {emotionSoundsEnabled
              ? "Disable sounds"
              : "Enable sounds"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEmotionManagerOpen(true);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Manage custom emotions
          </button>
        </div>

        <div className="hidden">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Vol
          </span>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={emotionSoundVolume}
            disabled={
              !emotionSoundsEnabled
            }
            onChange={(event) => {
              setEmotionSoundVolume(
                Number(
                  event.target.value
                )
              );
            }}
            aria-label="Emotion sound volume"
            className="min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-40"
          />

          <span className="w-9 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
            {Math.round(
              emotionSoundVolume * 100
            )}
            %
          </span>
        </div>

        <Dialog
          isOpen={isSoundVolumeOpen}
          toggleDialog={() =>
            setSoundVolumeOpen(false)
          }
        >
          <div className="flex w-[min(92vw,520px)] flex-col gap-4 bg-black p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Sound volume
                </h2>

                <p className="mt-1 text-xs text-zinc-300">
                  Adjust the emotion sound volume.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSoundVolumeOpen(false)
                }
                className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/70 bg-black p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-bold text-white">
                <span>Volume</span>
                <span>
                  {Math.round(
                    emotionSoundVolume * 100
                  )}
                  %
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={emotionSoundVolume}
                disabled={
                  !emotionSoundsEnabled
                }
                onChange={(event) => {
                  setEmotionSoundVolume(
                    Number(
                      event.target.value
                    )
                  );
                }}
                aria-label="Emotion sound volume"
                className="w-full disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
          </div>
        </Dialog>

        {emotionSoundError && (
          <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {emotionSoundError}
          </div>
        )}

        <ManageEmotionsDialog
          isOpen={isEmotionManagerOpen}
          onClose={() => {
            setEmotionManagerOpen(false);
          }}
        />
      </div>
    </SensorCard>
  );
};


export default EmotionWidget;
