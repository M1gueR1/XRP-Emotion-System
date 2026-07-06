import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaCamera,
  FaTrash,
} from "react-icons/fa";

import SensorCard from "./SensorCard";

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  useCameraStream,
} from "../vision/useCameraStream";

import {
  useFacePresenceDetector,
} from "../vision/useFacePresenceDetector";


const CAMERA_HAPPY_EMOTION_ID = 1;
const CAMERA_EXCITED_EMOTION_ID = 3;
const CAMERA_SAD_EMOTION_ID = 9;
const CAMERA_IDLE_EMOTION_ID = 0;
const CAMERA_UPSET_EMOTION_ID = 8;


type CameraDecision = {
  signal: string;
  emotionId: number;
  emotionLabel: string;
  confidence: number;
  reason: string;
};


const cameraStatusLabel = (
  status: string
): string => {
  switch (status) {
    case "requesting":
      return "Opening camera";

    case "ready":
      return "Camera active";

    case "error":
      return "Camera error";

    default:
      return "Camera off";
  }
};


const cameraStatusClass = (
  status: string
): string => {
  switch (status) {
    case "requesting":
      return "bg-amber-600";

    case "ready":
      return "bg-emerald-600";

    case "error":
      return "bg-red-600";

    default:
      return "bg-slate-600";
  }
};


const faceDetectionStatusLabel = (
  status: string,
  faceDetected: boolean
): string => {
  if (status === "loading") {
    return "Loading face model";
  }

  if (status === "error") {
    return "Face detection error";
  }

  if (status === "idle") {
    return "Face detection idle";
  }

  return faceDetected
    ? "Face detected"
    : "No face detected";
};


const faceDetectionStatusClass = (
  status: string,
  faceDetected: boolean
): string => {
  if (status === "loading") {
    return "bg-amber-600";
  }

  if (status === "error") {
    return "bg-red-600";
  }

  if (status === "idle") {
    return "bg-slate-600";
  }

  return faceDetected
    ? "bg-emerald-600"
    : "bg-zinc-700";
};


const expressionSignalLabel = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "Happy signal";

    case "surprised":
      return "Surprised signal";

    case "tongue_out":
      return "Tongue out signal";

    case "sad":
      return "Sad signal";

    case "upset":
      return "Upset signal";

    case "neutral":
      return "Neutral signal";

    default:
      return "No face signal";
  }
};


const expressionSignalClass = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "bg-emerald-600";

    case "surprised":
      return "bg-indigo-600";

    case "tongue_out":
      return "bg-fuchsia-600";

    case "sad":
      return "bg-blue-800";

    case "upset":
      return "bg-orange-700";

    case "neutral":
      return "bg-zinc-700";

    default:
      return "bg-slate-600";
  }
};


const percentageLabel = (
  value: number
): string =>
  `${Math.round(
    Math.min(
      Math.max(
        value,
        0
      ),
      1
    ) * 100
  )}%`;


const cameraSignalEmotionId = (
  signal: string
): number | null => {
  switch (signal) {
    case "happy":
      return CAMERA_HAPPY_EMOTION_ID;

    case "surprised":
    case "tongue_out":
      return CAMERA_EXCITED_EMOTION_ID;

    case "sad":
      return CAMERA_SAD_EMOTION_ID;

    case "upset":
      return CAMERA_UPSET_EMOTION_ID;

    case "neutral":
      return CAMERA_IDLE_EMOTION_ID;

    default:
      return null;
  }
};


const cameraSignalEmotionLabel = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "Happy";

    case "surprised":
    case "tongue_out":
      return "Excited";

    case "sad":
      return "Sad";

    case "upset":
      return "Upset";

    case "neutral":
      return "Idle / neutral";

    default:
      return "No change";
  }
};


const cameraSignalWhyText = (
  signal: string
): string => {
  switch (signal) {
    case "happy":
      return "The camera detected a smile-like visual cue, so the robot mirrors a happy expression.";

    case "surprised":
      return "The camera detected wide-eye or surprise-like visual cues, so the robot reacts with excitement.";

    case "tongue_out":
      return "The camera detected a playful mouth gesture, so the robot reacts as excited.";

    case "sad":
      return "The camera detected sadness-like mouth and eye cues, so the robot previews a sad expression.";

    case "upset":
      return "The camera detected eyebrow or tension cues that look frustrated, so the robot previews upset.";

    case "neutral":
      return "The camera detected a face without a strong expression, so the robot stays calm and attentive.";

    default:
      return "No strong visual signal was detected, so the robot does not change.";
  }
};


function emitDashboardEmotionPreview(
  decision: CameraDecision
): void {
  window.dispatchEvent(
    new CustomEvent(
      "xrp:dashboard-emotion-preview",
      {
        detail: {
          source: "camera_vision",
          emotionId:
            decision.emotionId,
          emotionLabel:
            decision.emotionLabel,
          signal:
            decision.signal,
          confidence:
            decision.confidence,
          reason:
            decision.reason,
        },
      }
    )
  );
}


const CameraVisionWidget: React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

  const [
    showVisionOptions,
    setShowVisionOptions,
  ] = useState(false);

  const [
    cameraEmotionControlEnabled,
    setCameraEmotionControlEnabled,
  ] = useState(false);

  const [
    lastCameraDecision,
    setLastCameraDecision,
  ] = useState<CameraDecision | null>(
    null
  );

  const lastCameraEmotionSignalRef =
    useRef<string | null>(null);

  const lastCameraEmotionChangedAtRef =
    useRef(0);

  const {
    videoRef: cameraVideoRef,
    status: cameraStatus,
    errorMessage: cameraErrorMessage,
    isCameraSupported,
    isCameraActive,
    startCamera,
    stopCamera,
  } = useCameraStream();

  const {
    status: faceDetectionStatus,
    errorMessage: faceDetectionErrorMessage,
    faceDetected,
    faceCount,
    expressionSignal,
    expressionConfidence,
    expressionScores,
  } = useFacePresenceDetector({
    videoRef: cameraVideoRef,
    isEnabled: isCameraActive,
  });

  useEffect(() => {
    if (
      !cameraEmotionControlEnabled ||
      !isCameraActive ||
      !faceDetected
    ) {
      lastCameraEmotionSignalRef.current =
        null;

      if (
        !cameraEmotionControlEnabled ||
        !isCameraActive
      ) {
        setLastCameraDecision(null);
      }

      return;
    }

    const mappedEmotionId =
      cameraSignalEmotionId(
        expressionSignal
      );

    if (mappedEmotionId === null) {
      return;
    }

    const strongEnough =
      expressionSignal === "neutral"
        ? expressionConfidence >= 0.55
        : expressionSignal === "sad"
          ? expressionConfidence >= 0.11
          : expressionSignal === "upset"
            ? expressionConfidence >= 0.12
            : expressionConfidence >= 0.20;

    if (!strongEnough) {
      return;
    }

    const previousSignal =
      lastCameraEmotionSignalRef.current;

    lastCameraEmotionSignalRef.current =
      expressionSignal;

    const shouldRequireRepeatedSignal =
      expressionSignal !== "sad" &&
      expressionSignal !== "upset";

    if (
      shouldRequireRepeatedSignal &&
      previousSignal !== expressionSignal
    ) {
      return;
    }

    const decision: CameraDecision = {
      signal:
        expressionSignal,
      emotionId:
        mappedEmotionId,
      emotionLabel:
        cameraSignalEmotionLabel(
          expressionSignal
        ),
      confidence:
        expressionConfidence,
      reason:
        cameraSignalWhyText(
          expressionSignal
        ),
    };

    setLastCameraDecision(
      decision
    );

    const now = Date.now();

    if (
      now -
        lastCameraEmotionChangedAtRef.current <
      1000
    ) {
      return;
    }

    lastCameraEmotionChangedAtRef.current =
      now;

    emitDashboardEmotionPreview(
      decision
    );
  }, [
    cameraEmotionControlEnabled,
    expressionConfidence,
    expressionSignal,
    faceDetected,
    isCameraActive,
  ]);

  return (
    <SensorCard
      title="Camera Vision"
      icon={<FaCamera size={16} />}
      onStart={() => {}}
      onStop={() => {}}
      isConnected={isCameraActive}
      lastUpdated={
        lastCameraDecision
          ? new Date().toISOString()
          : undefined
      }
    >
      <div className="absolute right-4 top-4">
        <button
          onClick={handleDelete}
          className="rounded p-2 text-red-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700"
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col gap-2 p-3 pt-10">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Vision-to-Emotion camera
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              Separate widget. Dashboard-only emotion preview.
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className={[
                "rounded-full px-2 py-1 text-[10px] font-bold text-white",
                cameraStatusClass(
                  cameraStatus
                ),
              ].join(" ")}
            >
              {cameraStatusLabel(
                cameraStatus
              )}
            </div>

            <button
              type="button"
              disabled={
                !isCameraSupported ||
                cameraStatus === "requesting"
              }
              onClick={() => {
                if (isCameraActive) {
                  stopCamera();
                } else {
                  void startCamera();
                }
              }}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-bold text-white transition",
                isCameraActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700",
                !isCameraSupported ||
                cameraStatus === "requesting"
                  ? "cursor-not-allowed opacity-50"
                  : "",
              ].join(" ")}
            >
              {isCameraActive
                ? "Cerrar cámara"
                : cameraStatus === "requesting"
                  ? "Abriendo..."
                  : "Activar cámara"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-300 bg-black dark:border-slate-700">
          {isCameraActive ? (
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full bg-black object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center px-3 text-center text-[11px] font-semibold text-white">
              La cámara aparecerá aquí cuando aceptes el permiso.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setShowVisionOptions(
              (current) => !current
            );
          }}
          className="w-full rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
        >
          {showVisionOptions
            ? "Hide vision options"
            : "See vision options"}
        </button>

        {showVisionOptions && (
          <>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-black px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white">
                  Use camera emotion
                </div>

                <div className="text-[10px] text-zinc-300">
                  Requires Emotion Face widget on the dashboard.
                </div>
              </div>

              <button
                type="button"
                disabled={!isCameraActive}
                onClick={() => {
                  setCameraEmotionControlEnabled(
                    (current) => !current
                  );
                }}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition",
                  cameraEmotionControlEnabled
                    ? "bg-fuchsia-600 hover:bg-fuchsia-700"
                    : "bg-slate-600 hover:bg-slate-700",
                  !isCameraActive
                    ? "cursor-not-allowed opacity-50"
                    : "",
                ].join(" ")}
              >
                {cameraEmotionControlEnabled
                  ? "On"
                  : "Off"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div
                className={[
                  "rounded-lg px-3 py-2 font-bold text-white",
                  faceDetectionStatusClass(
                    faceDetectionStatus,
                    faceDetected
                  ),
                ].join(" ")}
              >
                {faceDetectionStatusLabel(
                  faceDetectionStatus,
                  faceDetected
                )}
              </div>

              <div className="rounded-lg bg-black px-3 py-2 font-semibold text-white">
                Faces: {faceCount}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={[
                    "rounded-lg px-3 py-2 font-bold text-white",
                    expressionSignalClass(
                      expressionSignal
                    ),
                  ].join(" ")}
                >
                  {expressionSignalLabel(
                    expressionSignal
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2 font-semibold text-white">
                  Confidence: {" "}
                  {percentageLabel(
                    expressionConfidence
                  )}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Smile:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.smile
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Surprise:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.surprise
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Tongue:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.tongueOut
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Upset:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.upset
                  )}
                </div>


              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                <span className="font-bold">
                  Upset brow:
                </span>{" "}
                {percentageLabel(
                  expressionScores.upsetBrow
                )}
              </div>

              <div className="rounded-lg bg-zinc-950 px-3 py-2">
                <span className="font-bold">
                  Upset tension:
                </span>{" "}
                {percentageLabel(
                  expressionScores.upsetTension
                )}
              </div>
                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad total:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sad
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad mouth:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sadMouth
                  )}
                </div>

                <div className="rounded-lg bg-zinc-950 px-3 py-2">
                  <span className="font-bold">
                    Sad eyes:
                  </span>{" "}
                  {percentageLabel(
                    expressionScores.sadEyes
                  )}
                </div>
              </div>
            </div>

            {cameraEmotionControlEnabled &&
              lastCameraDecision && (
                <div className="rounded-xl border border-fuchsia-700 bg-black p-3 text-xs text-white">
                  <div className="grid gap-2">
                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Camera saw
                      </div>

                      <div className="mt-1 font-bold text-white">
                        {expressionSignalLabel(
                          lastCameraDecision.signal
                        )}{" "}
                        · {" "}
                        {percentageLabel(
                          lastCameraDecision.confidence
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Robot interpreted
                      </div>

                      <div className="mt-1 text-base font-bold text-white">
                        {lastCameraDecision.emotionLabel}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                        Why
                      </div>

                      <div className="mt-1 leading-5 text-white">
                        {lastCameraDecision.reason}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {faceDetectionErrorMessage && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                {faceDetectionErrorMessage}
              </div>
            )}

            {!isCameraSupported && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                Este navegador no soporta acceso a cámara.
              </div>
            )}

            {cameraErrorMessage && (
              <div className="rounded-lg bg-red-950 px-3 py-2 text-[11px] font-semibold text-white">
                {cameraErrorMessage}
              </div>
            )}
          </>
        )}
      </div>
    </SensorCard>
  );
};


export default CameraVisionWidget;
