import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import EmotionSoundManager from
  "../emotions/EmotionSoundManager";

import { FaRobot } from "react-icons/fa";

import useSensorData from "../hooks/useSensorData";

import useCustomEmotionCatalog from
  "../emotions/useCustomEmotionCatalog";

import ManageEmotionsDialog from
  "../emotions/ManageEmotionsDialog";

import type {
  EmotionData,
} from "../utils/sensorParsers";

import SensorCard from "./SensorCard";

import {
  getEmotionById,
} from "./emotionCatalog";


const DISPLAY_SCALE = 3;

const REPEAT_DEFAULT = 0;
const REPEAT_ONCE = 1;
const REPEAT_LOOP = 2;
const REPEAT_COUNT = 3;
const REPEAT_PING_PONG = 4;




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
  emotionSoundError,
  setEmotionSoundError,
] = useState("");


const lastSoundEventRef =
  useRef<string | null>(null);

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
    animationFinished,
    setAnimationFinished,
  ] = useState(false);

  const [localPlaying, setLocalPlaying] =
    useState(true);

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

  const usingRobotData =
    robotEmotion !== null;

  const activeEmotionId =
  robotEmotion?.emotionId ?? 0;

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
    robotEmotion?.emotionGeneration ?? 0;

  const playbackFps =
    robotEmotion &&
    robotEmotion.emotionFps > 0
      ? robotEmotion.emotionFps
      : config?.fps ?? 4;

  const catalogRepeatMode =
  customConfig?.repeatModeId ??
  REPEAT_DEFAULT;

const receivedRepeatMode =
  robotEmotion?.emotionRepeatMode ??
  REPEAT_DEFAULT;

const repeatMode =
  receivedRepeatMode !==
    REPEAT_DEFAULT
    ? receivedRepeatMode
    : catalogRepeatMode;

  const catalogRepeatCount =
  customConfig?.repeatCount ??
  -1;

const receivedRepeatCount =
  robotEmotion?.emotionRepeatCount ??
  -1;

const repeatCount =
  receivedRepeatCount >= 0
    ? receivedRepeatCount
    : catalogRepeatCount;

  const overrideFlags =
    robotEmotion?.emotionFlags ?? 0;

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
    robotEmotion?.emotionStatus === 1;

  const robotShouldAnimate =
  robotIsPlaying ||
  config.name === "idle";

  useEffect(() => {
    if (
      !emotionSoundsEnabled ||
      !usingRobotData ||
      !robotIsPlaying
    ) {
      return;
    }

    const soundEventKey =
      `${generation}:${activeEmotionId}`;

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
    usingRobotData,
  ]);

  const isPlaying =
  usingRobotData
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

        if (
          usingRobotData &&
          robotIsPlaying
        ) {
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

  const faceWidth =
    config.frameWidth *
    DISPLAY_SCALE;

  const faceHeight =
    config.frameHeight *
    DISPLAY_SCALE;

  const sheetWidth =
    config.frameWidth *
    config.frameCount *
    DISPLAY_SCALE;

  const sheetHeight =
    config.frameHeight *
    DISPLAY_SCALE;

  const backgroundX =
    currentFrameIndex *
    config.frameWidth *
    DISPLAY_SCALE;

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
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-3">
        <div className="flex min-h-52 w-full items-center justify-center overflow-hidden rounded-2xl bg-black shadow-inner">
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

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Sprite frame{" "}
            {currentFrameIndex + 1} ·{" "}
            {repeatLabel}
          </div>
        </div>

        

        {!usingRobotData && (
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={() => {
                setLocalPlaying(
                  (current) => !current
                );
                setAnimationFinished(
                  false
                );
              }}
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              {localPlaying
                ? "Pause"
                : "Play"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSequencePosition(0);
                setCompletedCycles(0);
                setAnimationFinished(
                  false
                );
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200"
            >
              Reset
            </button>
          </div>
        )}

        <div className="w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                void toggleEmotionSounds();
              }}
              className={[
                "flex-1 rounded-lg px-3 py-2",
                "text-sm font-semibold",
                "transition",
                emotionSoundsEnabled
                  ? "bg-slate-700 text-white hover:bg-slate-600"
                  : "bg-blue-600 text-white hover:bg-blue-700",
              ].join(" ")}
            >
              {emotionSoundsEnabled
                ? "Disable emotion sounds"
                : "Enable emotion sounds"}
            </button>

            <span className="min-w-12 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
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
            className="mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40"
          />

          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sounds play once when the active emotion changes.
          </div>

          {emotionSoundError && (
            <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {emotionSoundError}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setEmotionManagerOpen(true);
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Manage custom emotions
        </button>

        <ManageEmotionsDialog
          isOpen={isEmotionManagerOpen}
          onClose={() => {
            setEmotionManagerOpen(false);
          }}
        />

        <div className="text-center text-xs text-slate-400">
          {usingRobotData
            ? (
              <>
                Robot mode · Generation{" "}
                {generation} ·{" "}
                {playbackFps} FPS
                <br />
                Flags {overrideFlags} ·
                Cycles {completedCycles}
                {animationFinished
                  ? " · Finished"
                  : ""}
              </>
            )
            : "Local preview mode"}
        </div>
      </div>
    </SensorCard>
  );
};


export default EmotionWidget;
