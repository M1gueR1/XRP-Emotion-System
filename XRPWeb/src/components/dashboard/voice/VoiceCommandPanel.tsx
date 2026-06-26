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
    case "turn_back":
      return "Move back";
    case "turn_happy":
      return "Turn happy";
    case "turn_sad":
      return "Turn sad";
    case "turn_excited":
      return "Turn excited";
    case "turn_in_love":
      return "Turn in love";
    case "stop":
      return "Stop";
    case "showtime":
      return "Showtime";
    case "go_to_sleep":
      return "Go to sleep";
    case "lets_play":
      return "Let's play";
    case "unknown":
      return "Unknown";
    default:
      return "—";
  }
}


function VoiceCommandPanel({
  onCommand,
}: VoiceCommandPanelProps) {
  const [
    commandError,
    setCommandError,
  ] = useState("");

  const {
    isSupported,
    isListening,
    lastTranscript,
    lastAction,
    errorMessage,
    startListening,
    stopListening,
  } = useVoiceCommands({
    cooldownMs: 700,

    onCommand: async (result) => {
      setCommandError("");

      try {
        await onCommand?.(
          result.action,
          result
        );
      } catch (error) {
        setCommandError(
          error instanceof Error
            ? error.message
            : String(error)
        );
      }
    },
  });

  return (
    <div className="w-full rounded-xl border border-slate-200 p-2 dark:border-slate-700">
      <div className="flex items-center gap-2">
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
            "shrink-0 rounded-lg px-3 py-2",
            "text-xs font-bold",
            "text-white shadow-sm transition",
            isListening
              ? "bg-red-600 hover:bg-red-700"
              : "bg-blue-600 hover:bg-blue-700",
            !isSupported
              ? "cursor-not-allowed opacity-50"
              : "",
          ].join(" ")}
        >
          {isListening
            ? "Stop voice"
            : "Enable voice"}
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 text-xs">
          <div className="min-w-0 truncate rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-900">
            <span className="text-slate-500 dark:text-slate-400">
              Last heard:
            </span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {lastTranscript || "—"}
            </span>
          </div>

          <div className="min-w-0 truncate rounded-lg bg-slate-100 px-2 py-1.5 dark:bg-slate-900">
            <span className="text-slate-500 dark:text-slate-400">
              Action:
            </span>{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {actionLabel(
                lastAction
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Try: Hello XRP · Are you ready? · I'm really happy · Turn left ·
        Turn right · Move back · Stop · Showtime · Go to sleep
      </div>

      {(errorMessage || commandError) && (
        <div className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage || commandError}
        </div>
      )}
    </div>
  );
}


export default VoiceCommandPanel;
