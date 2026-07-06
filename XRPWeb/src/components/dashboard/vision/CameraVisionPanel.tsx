import {
  useMemo,
} from "react";

import {
  useCameraStream,
} from "./useCameraStream";


function statusLabel(
  status: string
): string {
  switch (status) {
    case "requesting":
      return "Requesting camera";
    case "ready":
      return "Camera ready";
    case "error":
      return "Camera error";
    default:
      return "Camera idle";
  }
}


function statusColorClass(
  status: string
): string {
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
}


export default function CameraVisionPanel() {
  const {
    videoRef,
    status,
    errorMessage,
    isCameraSupported,
    isCameraActive,
    startCamera,
    stopCamera,
  } = useCameraStream();

  const cameraButtonLabel =
    useMemo(() => {
      if (isCameraActive) {
        return "Close camera";
      }

      if (status === "requesting") {
        return "Opening camera...";
      }

      return "Open camera";
    }, [
      isCameraActive,
      status,
    ]);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Vision-to-Emotion
          </h3>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Step 1: camera preview only. No video is saved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={[
              "rounded-full px-2 py-1 text-[11px] font-bold text-white",
              statusColorClass(
                status
              ),
            ].join(" ")}
          >
            {statusLabel(
              status
            )}
          </div>

          <button
            type="button"
            disabled={
              !isCameraSupported ||
              status === "requesting"
            }
            onClick={() => {
              if (isCameraActive) {
                stopCamera();
              } else {
                void startCamera();
              }
            }}
            className={[
              "rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition",
              isCameraActive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700",
              !isCameraSupported ||
              status === "requesting"
                ? "cursor-not-allowed opacity-50"
                : "",
            ].join(" ")}
          >
            {cameraButtonLabel}
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-700">
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full bg-black object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-black px-4 text-center text-xs font-semibold text-white">
            Camera preview will appear here after permission is granted.
          </div>
        )}
      </div>

      {!isCameraSupported && (
        <div className="mt-2 rounded-lg bg-red-950 px-3 py-2 text-xs font-semibold text-white">
          This browser does not support camera access.
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 rounded-lg bg-red-950 px-3 py-2 text-xs font-semibold text-white">
          {errorMessage}
        </div>
      )}

      <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-[11px] leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
        Next steps: face detection, expression signals, then mapping visual signals
        to robot emotions like Idle, Happy, Excited, Sad, Upset, and In Love.
      </div>
    </div>
  );
}
