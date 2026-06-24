import {
  useState,
} from "react";

import {
  type VoiceCommandAction,
  type VoiceCommandResult,
  useVoiceCommands,
} from "./useVoiceCommands";


type VoiceCommandPanelProps = {
  onCommand?: (
    action: VoiceCommandAction,
    result: VoiceCommandResult
  ) => Promise<void> | void;
};


function actionLabel(
  action: string | null
): string {
  switch (action) {
    case "turn_right":
      return "Turn right";

    case "turn_left":
      return "Turn left";

    case "turn_happy":
      return "Turn happy";

    case "turn_sad":
      return "Turn sad";

    case "unknown":
      return "Unknown command";

    default:
      return "None yet";
  }
}


function VoiceCommandPanel({
  onCommand,
}: VoiceCommandPanelProps) {
  const [
    commandStatus,
    setCommandStatus,
  ] = useState("");

  const [
    commandError,
    setCommandError,
  ] = useState("");

  const {
    isSupported,
    isListening,
    lastTranscript,
    lastAction,
    lastResult,
    errorMessage,
    startListening,
    stopListening,
  } = useVoiceCommands({
    cooldownMs: 800,

    onCommand: async (result) => {
      setCommandError("");

      setCommandStatus(
        `Running ${actionLabel(
          result.action
        )}...`
      );

      try {
        await onCommand?.(
          result.action,
          result
        );

        setCommandStatus(
          `Handled ${actionLabel(
            result.action
          )}.`
        );
      } catch (error) {
        setCommandStatus("");

        setCommandError(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    },
  });

  return (
    <div className="w-full rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Voice commands
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Say: turn right, turn left,
            turn happy, or turn sad.
          </div>
        </div>

        <button
          type="button"
          disabled={!isSupported}
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          className={[
            "rounded-lg px-3 py-2",
            "text-sm font-semibold",
            "transition",
            isListening
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
            !isSupported
              ? "cursor-not-allowed opacity-50"
              : "",
          ].join(" ")}
        >
          {isListening
            ? "Stop listening"
            : "Enable voice"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-900">
        <div>
          Status:{" "}
          <span className="font-semibold">
            {isListening
              ? "Listening..."
              : isSupported
                ? "Ready"
                : "Not supported"}
          </span>
        </div>

        <div>
          Last heard:{" "}
          <span className="font-semibold">
            {lastTranscript ||
              "Nothing yet"}
          </span>
        </div>

        <div>
          Detected action:{" "}
          <span className="font-semibold">
            {actionLabel(
              lastAction
            )}
          </span>
        </div>

        {lastResult && (
          <div className="text-slate-500 dark:text-slate-400">
            {lastResult.confidenceLabel}
          </div>
        )}

        {commandStatus && (
          <div className="rounded bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {commandStatus}
          </div>
        )}

        {(errorMessage || commandError) && (
          <div className="rounded bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMessage || commandError}
          </div>
        )}
      </div>
    </div>
  );
}


export default VoiceCommandPanel;
