import {
  useMemo,
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
    case "turn_idle":
      return "Turn idle";
    case "turn_upset":
      return "Turn upset";
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


function friendlyIntentLabel(
  result: VoiceCommandResult | null
): string {
  if (!result) {
    return "—";
  }

  if (result.intentLabel === "Idle") {
    return "Idle / neutral";
  }

  if (result.intentLabel === "In love") {
    return "In love / friendly";
  }

  if (result.intentLabel === "Upset") {
    return "Upset / frustrated";
  }

  return result.intentLabel;
}


function confidenceLabel(
  score: number
): string {
  if (score >= 0.9) {
    return "High";
  }

  if (score >= 0.7) {
    return "Medium";
  }

  if (score > 0) {
    return "Low";
  }

  return "None";
}


function sourceLabel(
  source: string
): string {
  switch (source) {
    case "semantic_ml":
      return "Semantic ML";
    case "event_sentiment":
      return "Event sentiment";
    case "advanced_reasoner":
      return "Advanced reasoner";
    case "intent_engine":
      return "Intent engine";
    default:
      return source;
  }
}


function semanticStatusLabel(
  status: string
): string {
  switch (status) {
    case "ready":
      return "ML ready";
    case "loading":
      return "ML loading";
    case "error":
      return "ML error";
    default:
      return "ML idle";
  }
}


function demoWhyText(
  result: VoiceCommandResult | null
): string {
  if (!result) {
    return "Waiting for the student to speak.";
  }

  if (result.contextReason) {
    return result.contextReason;
  }

  if (result.decisionReason) {
    return result.decisionReason;
  }

  if (result.confidenceLabel) {
    return result.confidenceLabel;
  }

  return "The robot selected the safest available emotional response.";
}


function VoiceCommandPanel({
  onCommand,
}: VoiceCommandPanelProps) {
  const [
    commandError,
    setCommandError,
  ] = useState("");

  const [
    semanticEnabled,
    setSemanticEnabled,
  ] = useState(true);

  const [
    advancedReasoningEnabled,
    setAdvancedReasoningEnabled,
  ] = useState(true);

  const [
    technicalMode,
    setTechnicalMode,
  ] = useState(false);

  const [
    showAdminOptions,
    setShowAdminOptions,
  ] = useState(false);

  const {
    isSupported,
    isListening,
    isSemanticModelBusy,
    semanticModelStatus,
    lastTranscript,
    lastAction,
    lastResult,
    errorMessage,
    preloadSemanticModel,
    startListening,
    stopListening,
  } = useVoiceCommands({
    cooldownMs: 700,
    semanticEnabled,
    advancedReasoningEnabled,

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

  const confidencePercent =
    useMemo(() => {
      if (!lastResult) {
        return 0;
      }

      return Math.round(
        lastResult.confidenceScore *
          100
      );
    }, [lastResult]);

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
          <div className="min-w-0 truncate rounded-lg bg-slate-100 px-2 py-1.5 text-slate-900 dark:bg-slate-900 dark:text-white">
            <span className="text-slate-600 dark:text-slate-300">
              Last heard:
            </span>{" "}
            <span className="font-bold">
              {lastTranscript || "—"}
            </span>
          </div>

          <div className="min-w-0 truncate rounded-lg bg-slate-100 px-2 py-1.5 text-slate-900 dark:bg-slate-900 dark:text-white">
            <span className="text-slate-600 dark:text-slate-300">
              Action:
            </span>{" "}
            <span className="font-bold">
              {actionLabel(
                lastAction
              )}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAdminOptions(
              (current) => !current
            );
          }}
          className={[
            "shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition",
            showAdminOptions
              ? "bg-slate-800 hover:bg-black"
              : "bg-slate-600 hover:bg-slate-700",
          ].join(" ")}
        >
          {showAdminOptions
            ? "Hide admin options"
            : "See admin options"}
        </button>
      </div>

      {showAdminOptions && (
        <div className="mt-2 rounded-xl border border-slate-700 bg-black p-2 text-white shadow-sm">
          <div className="grid grid-cols-5 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setTechnicalMode(
                  (current) => !current
                );
              }}
              className={[
                "rounded-lg px-2 py-1.5 font-bold text-white transition",
                technicalMode
                  ? "bg-slate-700 hover:bg-slate-600"
                  : "bg-indigo-600 hover:bg-indigo-500",
              ].join(" ")}
            >
              {technicalMode
                ? "Technical mode"
                : "Demo mode"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSemanticEnabled(
                  (current) => !current
                );
              }}
              className={[
                "rounded-lg px-2 py-1.5 font-bold text-white transition",
                semanticEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-slate-600 hover:bg-slate-500",
              ].join(" ")}
            >
              Semantic ML:{" "}
              {semanticEnabled
                ? "On"
                : "Off"}
            </button>

            <button
              type="button"
              onClick={() => {
                setAdvancedReasoningEnabled(
                  (current) => !current
                );
              }}
              className={[
                "rounded-lg px-2 py-1.5 font-bold text-white transition",
                advancedReasoningEnabled
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "bg-slate-600 hover:bg-slate-500",
              ].join(" ")}
            >
              Advanced:{" "}
              {advancedReasoningEnabled
                ? "On"
                : "Off"}
            </button>

            <button
              type="button"
              disabled={
                !semanticEnabled ||
                semanticModelStatus === "loading"
              }
              onClick={() => {
                void preloadSemanticModel();
              }}
              className={[
                "rounded-lg px-2 py-1.5 font-bold text-white transition",
                semanticModelStatus === "ready"
                  ? "bg-indigo-600 hover:bg-indigo-500"
                  : "bg-purple-600 hover:bg-purple-500",
                !semanticEnabled ||
                semanticModelStatus === "loading"
                  ? "cursor-not-allowed opacity-50"
                  : "",
              ].join(" ")}
            >
              {semanticModelStatus === "ready"
                ? "AI preloaded"
                : semanticModelStatus === "loading"
                  ? "Loading AI..."
                  : "Preload AI"}
            </button>

            <div className="rounded-lg bg-zinc-900 px-2 py-1.5 font-bold text-white">
              {semanticStatusLabel(
                semanticModelStatus
              )}
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-zinc-950 px-2 py-1.5 text-[11px] leading-5 text-white">
            Try: I hate you · I need to study but I am stressed · today I need to study ·
            Colombia lost its match · the chair is blue · You help me a lot · bad robot
          </div>
        </div>
      )}

      {showAdminOptions && isSemanticModelBusy && (
        <div className="mt-2 rounded-lg bg-black px-2 py-1.5 text-[11px] font-semibold text-white">
          Semantic ML is loading or comparing meaning...
        </div>
      )}

      {showAdminOptions && lastResult && !technicalMode && (
        <div className="mt-2 rounded-xl border border-zinc-700 bg-black p-3 text-xs text-white shadow-sm">
          <div className="grid gap-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Student said
              </div>
              <div className="mt-1 font-semibold text-white">
                "{lastResult.transcript || lastTranscript}"
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Robot interpreted
              </div>
              <div className="mt-1 text-base font-bold text-white">
                {friendlyIntentLabel(
                  lastResult
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Why
              </div>
              <div className="mt-1 leading-5 text-white">
                {demoWhyText(
                  lastResult
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white">
                <span className="font-bold">
                  Confidence:
                </span>{" "}
                {confidencePercent}%
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white">
                <span className="font-bold">
                  Source:
                </span>{" "}
                {sourceLabel(
                  lastResult.source
                )}
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white">
                <span className="font-bold">
                  Robot action:
                </span>{" "}
                {actionLabel(
                  lastResult.action
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdminOptions && lastResult && technicalMode && (
        <div className="mt-2 rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Source
              </div>
              <div className="font-bold">
                {sourceLabel(
                  lastResult.source
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Detected intent
              </div>
              <div className="font-bold">
                {lastResult.intentLabel}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Confidence
              </div>
              <div className="font-bold">
                {confidencePercent}% ·{" "}
                {confidenceLabel(
                  lastResult.confidenceScore
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Category
              </div>
              <div className="font-bold capitalize">
                {lastResult.intentCategory}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 leading-5 text-white">
            <span className="font-semibold">
              Reason:
            </span>{" "}
            {lastResult.confidenceLabel}

            {lastResult.decisionReason && (
              <>
                {" "}· decision{" "}
                <span className="font-semibold">
                  {lastResult.decisionReason}
                </span>
              </>
            )}

            {lastResult.repeatCount > 1 && (
              <>
                {" "}· repeat x
                {lastResult.repeatCount}
              </>
            )}

            {lastResult.advancedMatchedPrototype && (
              <>
                {" "}· advanced prototype{" "}
                <span className="font-semibold">
                  "{lastResult.advancedMatchedPrototype}"
                </span>
              </>
            )}

            {lastResult.contextReason && (
              <>
                {" "}· context{" "}
                <span className="font-semibold">
                  {lastResult.contextReason}
                </span>
              </>
            )}

            {lastResult.semanticMatchText && (
              <>
                {" "}· closest example{" "}
                <span className="font-semibold">
                  "{lastResult.semanticMatchText}"
                </span>
              </>
            )}

            {typeof lastResult.semanticSimilarity === "number" && (
              <>
                {" "}· similarity{" "}
                {lastResult.semanticSimilarity.toFixed(2)}
              </>
            )}

            {lastResult.matchedRuleId && (
              <>
                {" "}· rule{" "}
                <span className="font-mono">
                  {lastResult.matchedRuleId}
                </span>
              </>
            )}
          </div>

          {lastResult.decisionCandidates &&
            lastResult.decisionCandidates.length > 0 && (
              <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-white">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Decision candidates
                </div>

                <div className="grid gap-1">
                  {lastResult.decisionCandidates.map(
                    (candidate, index) => (
                      <div
                        key={`${candidate.source}-${candidate.matchedRuleId ?? index}`}
                        className="grid grid-cols-5 gap-1 rounded-md border border-zinc-800 bg-black px-2 py-1 text-white"
                      >
                        <span className="font-bold text-white">
                          #{index + 1}
                        </span>
                        <span>
                          {sourceLabel(
                            candidate.source
                          )}
                        </span>
                        <span className="font-semibold">
                          {candidate.intentLabel}
                        </span>
                        <span>
                          raw{" "}
                          {Math.round(
                            candidate.confidenceScore *
                              100
                          )}
                          %
                        </span>
                        <span>
                          adj{" "}
                          {candidate.adjustedScore.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {showAdminOptions && (errorMessage || commandError) && (
        <div className="mt-2 rounded bg-red-950 px-2 py-1 text-xs font-semibold text-white">
          {errorMessage || commandError}
        </div>
      )}
    </div>
  );
}


export default VoiceCommandPanel;
