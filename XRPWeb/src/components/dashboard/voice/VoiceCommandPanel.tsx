import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type VoiceCommandAction,
  type VoiceCommandResult,
  useVoiceCommands,
} from "./useVoiceCommands";

import Dialog from "../../dialogs/dialog";


type VoiceCommandPanelProps = {
  onCommand?: (
    action: VoiceCommandAction,
    result: VoiceCommandResult
  ) => Promise<void> | void;
};


const ROBOT_CHAT_VOICE_INPUT_EVENT =
  "xrp:robot-chat-voice-input";

const VOICE_TO_CHAT_PAUSE_MS = 1400;


type ChatVoiceMode =
  | "auto"
  | "manual"
  | "off";


function normalizeVoiceFragment(
  text: string
): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9ñ\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function splitWords(
  text: string
): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}


function isCommandOnlyForChat(
  result: VoiceCommandResult
): boolean {
  const transcript =
    result.transcript?.trim() ?? "";

  const normalized =
    normalizeVoiceFragment(transcript);

  const wordCount =
    normalized
      ? normalized.split(" ").length
      : 0;

  const action =
    String(result.action ?? "");

  const commandOnlyActions =
    new Set([
      "turn_left",
      "turn_right",
      "turn_back",
      "stop",
      "showtime",
      "go_to_sleep",
      "lets_play",
    ]);

  if (
    commandOnlyActions.has(action) &&
    wordCount <= 5
  ) {
    return true;
  }

  return /^(move|turn|stop|go to sleep|lets play|let s play)\b/.test(
    normalized
  );
}


function titleCaseFirst(
  value: string
): string {
  const clean =
    value.trim();

  if (!clean) {
    return clean;
  }

  return (
    clean.charAt(0).toUpperCase() +
    clean.slice(1)
  );
}


function latestRegexGroup(
  text: string,
  regex: RegExp,
  groupIndex: number
): string | null {
  let latest:
    string | null = null;

  for (
    let match = regex.exec(text);
    match;
    match = regex.exec(text)
  ) {
    const value =
      match[groupIndex]?.trim();

    if (value) {
      latest = value;
    }
  }

  return latest;
}


function removeImmediateDuplicateClauses(
  text: string
): string {
  const parts =
    text
      .replace(/\s+/g, " ")
      .split(/\s+(?:and\s+)?(?=my name is|i am|i'm|im|i like|i love|i enjoy|i prefer|i have)/gi)
      .map((part) => part.trim())
      .filter(Boolean);

  const result:
    string[] = [];

  for (const part of parts) {
    const normalized =
      normalizeVoiceFragment(part);

    const previous =
      result[result.length - 1];

    if (
      previous &&
      normalizeVoiceFragment(previous) === normalized
    ) {
      continue;
    }

    result.push(part);
  }

  return result.join(" ");
}


function compactIntroVoiceDraft(
  draft: string
): string {
  const clean =
    removeImmediateDuplicateClauses(
      draft.replace(/\s+/g, " ").trim()
    );

  const normalized =
    normalizeVoiceFragment(clean);

  const hasRepeatedIntro =
    (
      normalized.match(
        /\bmy name is\b/g
      ) ?? []
    ).length > 1;

  const hasIntroSignal =
    /\bmy name is\b/.test(normalized);

  if (!hasRepeatedIntro && !hasIntroSignal) {
    return clean;
  }

  const name =
    latestRegexGroup(
      clean,
      /\bmy name is\s+([A-ZÁÉÍÓÚÑa-záéíóúñ'-]+)\b/gi,
      1
    );

  const age =
    latestRegexGroup(
      clean,
      /\b(?:i\s*'?m|im|i am)\s+(\d{1,2})\s+(?:years old|year old|yo|años|anos)\b/gi,
      1
    );

  const like =
    latestRegexGroup(
      clean,
      /\b(?:i like|i love|i enjoy|i prefer)\s+(.+?)(?=\s+\bmy name is\b|\s+\b(?:i\s*'?m|im|i am)\s+\d{1,2}\b|$)/gi,
      1
    );

  const have =
    latestRegexGroup(
      clean,
      /\b(?:i have|ive got|i've got)\s+(.+?)(?=\s+\bmy name is\b|\s+\b(?:i\s*'?m|im|i am)\s+\d{1,2}\b|\s+\bi like\b|$)/gi,
      1
    );

  const rebuilt:
    string[] = [];

  if (name) {
    rebuilt.push(
      `My name is ${titleCaseFirst(name)}.`
    );
  }

  if (age) {
    rebuilt.push(
      `I'm ${age} years old.`
    );
  }

  if (like) {
    rebuilt.push(
      `I like ${like.trim()}.`
    );
  }

  if (have) {
    rebuilt.push(
      `I have ${have.trim()}.`
    );
  }

  if (rebuilt.length >= 2) {
    return rebuilt.join(" ");
  }

  /*
   * Fallback: if there are several repeated intros, keep the final
   * "my name is ..." segment because browser speech recognition often
   * emits progressively corrected versions and the final one is usually
   * the cleanest.
   */
  if (hasRepeatedIntro) {
    const lower =
      clean.toLowerCase();

    const lastIndex =
      lower.lastIndexOf("my name is");

    if (lastIndex >= 0) {
      return clean.slice(lastIndex).trim();
    }
  }

  return clean;
}


type VoiceFragmentRecord = {
  text: string;
  normalized: string;
  at: number;
};


function normalizedTokens(
  value: string
): string[] {
  return normalizeVoiceFragment(value)
    .split(" ")
    .filter(Boolean);
}


function tokenOverlapRatio(
  smallText: string,
  largeText: string
): number {
  const smallTokens =
    normalizedTokens(smallText);

  const largeTokenSet =
    new Set(
      normalizedTokens(largeText)
    );

  if (smallTokens.length === 0) {
    return 0;
  }

  const overlap =
    smallTokens.filter((token) =>
      largeTokenSet.has(token)
    ).length;

  return overlap / smallTokens.length;
}


function isProgressiveFragment(
  previous: string,
  next: string
): boolean {
  const previousTokens =
    normalizedTokens(previous);

  const nextTokens =
    normalizedTokens(next);

  if (
    previousTokens.length === 0 ||
    nextTokens.length === 0
  ) {
    return false;
  }

  if (
    next.includes(previous) ||
    previous.includes(next)
  ) {
    return true;
  }

  const minLength =
    Math.min(
      previousTokens.length,
      nextTokens.length
    );

  let samePrefix = 0;

  for (
    let index = 0;
    index < minLength;
    index += 1
  ) {
    const previousToken =
      previousTokens[index];

    const nextToken =
      nextTokens[index];

    if (
      previousToken === nextToken ||
      nextToken.startsWith(previousToken) ||
      previousToken.startsWith(nextToken)
    ) {
      samePrefix += 1;
    } else {
      break;
    }
  }

  return (
    samePrefix >= Math.max(1, minLength - 1) &&
    Math.abs(
      previousTokens.length -
        nextTokens.length
    ) <= 3
  );
}


function addVoiceFragmentRecord(
  records: VoiceFragmentRecord[],
  fragment: string
): VoiceFragmentRecord[] {
  const clean =
    fragment.replace(/\s+/g, " ").trim();

  const normalized =
    normalizeVoiceFragment(clean);

  if (!normalized) {
    return records;
  }

  const now =
    Date.now();

  const updated =
    [...records];

  const recentDuplicate =
    updated.some((record) =>
      record.normalized === normalized &&
      now - record.at < 1800
    );

  if (recentDuplicate) {
    return updated;
  }

  for (
    let index = updated.length - 1;
    index >= 0;
    index -= 1
  ) {
    const record =
      updated[index];

    if (
      record.normalized.includes(normalized)
    ) {
      return updated;
    }

    if (
      normalized.includes(record.normalized) ||
      isProgressiveFragment(
        record.normalized,
        normalized
      )
    ) {
      updated.splice(index, 1);
    }
  }

  updated.push({
    text: clean,
    normalized,
    at: now,
  });

  return updated.slice(-10);
}


function removeCoveredVoiceFragments(
  records: VoiceFragmentRecord[]
): VoiceFragmentRecord[] {
  return records.filter((record, index) => {
    const recordTokens =
      normalizedTokens(
        record.normalized
      );

    return !records.some((other, otherIndex) => {
      if (index === otherIndex) {
        return false;
      }

      const otherTokens =
        normalizedTokens(
          other.normalized
        );

      if (
        otherTokens.length <
        recordTokens.length + 2
      ) {
        return false;
      }

      const overlapRatio =
        tokenOverlapRatio(
          record.normalized,
          other.normalized
        );

      /*
       * Browser speech recognition often emits partial hypotheses
       * before a better, longer hypothesis. This removes short
       * covered fragments without knowing the topic of the sentence.
       */
      return (
        overlapRatio >= 0.5 &&
        (
          recordTokens.length <= 4 ||
          otherTokens.length >=
            recordTokens.length * 1.8
        )
      );
    });
  });
}


function maxWordOverlap(
  left: string,
  right: string
): number {
  const leftWords =
    splitWords(left).map(
      normalizeVoiceFragment
    );

  const rightWords =
    splitWords(right).map(
      normalizeVoiceFragment
    );

  const maxOverlap =
    Math.min(
      leftWords.length,
      rightWords.length
    );

  for (
    let overlap = maxOverlap;
    overlap > 0;
    overlap -= 1
  ) {
    const leftSuffix =
      leftWords.slice(-overlap).join(" ");

    const rightPrefix =
      rightWords.slice(0, overlap).join(" ");

    if (
      leftSuffix &&
      leftSuffix === rightPrefix
    ) {
      return overlap;
    }
  }

  return 0;
}


function mergeStableVoiceFragments(
  records: VoiceFragmentRecord[]
): string {
  const reduced =
    removeCoveredVoiceFragments(records);

  const merged:
    string[] = [];

  for (const record of reduced) {
    if (merged.length === 0) {
      merged.push(record.text);
      continue;
    }

    const previous =
      merged[merged.length - 1];

    const overlap =
      maxWordOverlap(
        previous,
        record.text
      );

    if (overlap > 0) {
      const nextWords =
        splitWords(record.text);

      merged[merged.length - 1] = [
        ...splitWords(previous),
        ...nextWords.slice(overlap),
      ].join(" ");
    } else {
      merged.push(record.text);
    }
  }

  return merged.join(". ");
}


function polishVoiceTranscript(
  text: string
): string {
  const polished =
    text
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?])/g, "$1")
      .replace(/\bi am\b/gi, "I'm")
      .replace(/\bim\b/gi, "I'm")
      .replace(/\bi m\b/gi, "I'm")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bdidnt\b/gi, "didn't")
      .replace(/\bcouldnt\b/gi, "couldn't")
      .replace(/\bwont\b/gi, "won't")
      .trim();

  return titleCaseFirst(polished);
}


function stabilizeVoiceTranscript(
  records: VoiceFragmentRecord[]
): string {
  const merged =
    mergeStableVoiceFragments(records);

  const compacted =
    compactVoiceChatDraft(merged);

  return polishVoiceTranscript(
    compacted
  );
}


function compactVoiceChatDraft(
  draft: string
): string {
  const compactIntro =
    compactIntroVoiceDraft(draft);

  return compactIntro
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}


function emitRobotChatVoiceInput(
  transcript: string,
  result?: VoiceCommandResult
): void {
  if (typeof window === "undefined") {
    return;
  }

  const cleanTranscript =
    transcript.trim();

  if (!cleanTranscript) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      ROBOT_CHAT_VOICE_INPUT_EVENT,
      {
        detail: {
          transcript:
            cleanTranscript,
          source:
            "voice_command_panel",
          action:
            result?.action,
          intentLabel:
            result?.intentLabel,
          confidenceScore:
            result?.confidenceScore,
        },
      }
    )
  );
}


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
    case "custom_voice_keyword":
      return "Custom voice keyword";
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
    chatVoiceMode,
    setChatVoiceMode,
  ] = useState<ChatVoiceMode>("auto");

  const [
    voiceChatDraft,
    setVoiceChatDraft,
  ] = useState("");

  const [
    voiceChatCleanDraft,
    setVoiceChatCleanDraft,
  ] = useState("");

  const voiceChatDraftRef =
    useRef("");

  const voiceChatCleanDraftRef =
    useRef("");

  const voiceChatFragmentsRef =
    useRef<VoiceFragmentRecord[]>([]);

  const voiceChatTimerRef =
    useRef<number | null>(null);

  const lastVoiceFragmentRef =
    useRef<{
      normalized: string;
      at: number;
    } | null>(null);

  const [
    technicalMode,
    setTechnicalMode,
  ] = useState(false);

  const [
    showAdminOptions,
    setShowAdminOptions,
  ] = useState(false);

  const [
    showChatVoiceSettings,
    setShowChatVoiceSettings,
  ] = useState(false);

  const clearVoiceChatTimer = (): void => {
    if (
      voiceChatTimerRef.current !== null
    ) {
      window.clearTimeout(
        voiceChatTimerRef.current
      );

      voiceChatTimerRef.current =
        null;
    }
  };


  const clearVoiceChatDraft = (): void => {
    clearVoiceChatTimer();

    voiceChatDraftRef.current = "";
    voiceChatCleanDraftRef.current = "";
    voiceChatFragmentsRef.current = [];

    setVoiceChatDraft("");
    setVoiceChatCleanDraft("");

    lastVoiceFragmentRef.current = null;
  };


  const flushVoiceChatDraft = (
    result?: VoiceCommandResult
  ): void => {
    clearVoiceChatTimer();

    const draft =
      voiceChatCleanDraftRef.current.trim() ||
      stabilizeVoiceTranscript(
        voiceChatFragmentsRef.current
      );

    if (!draft) {
      return;
    }

    emitRobotChatVoiceInput(
      draft,
      result
    );

    voiceChatDraftRef.current = "";
    voiceChatCleanDraftRef.current = "";
    voiceChatFragmentsRef.current = [];

    setVoiceChatDraft("");
    setVoiceChatCleanDraft("");

    lastVoiceFragmentRef.current = null;
  };


  const queueVoiceChatTranscript = (
    result: VoiceCommandResult
  ): void => {
    if (
      chatVoiceMode === "off" ||
      isCommandOnlyForChat(result)
    ) {
      return;
    }

    const fragment =
      result.transcript?.trim() ?? "";

    const normalized =
      normalizeVoiceFragment(fragment);

    if (!normalized) {
      return;
    }

    const now =
      Date.now();

    const lastFragment =
      lastVoiceFragmentRef.current;

    if (
      lastFragment &&
      lastFragment.normalized === normalized &&
      now - lastFragment.at < 1600
    ) {
      return;
    }

    lastVoiceFragmentRef.current = {
      normalized,
      at: now,
    };

    const nextRecords =
      addVoiceFragmentRecord(
        voiceChatFragmentsRef.current,
        fragment
      );

    voiceChatFragmentsRef.current =
      nextRecords;

    const rawDraft =
      nextRecords
        .map((record) => record.text)
        .join(" | ");

    const cleanDraft =
      stabilizeVoiceTranscript(
        nextRecords
      );

    voiceChatDraftRef.current =
      rawDraft;

    voiceChatCleanDraftRef.current =
      cleanDraft;

    setVoiceChatDraft(rawDraft);
    setVoiceChatCleanDraft(cleanDraft);

    clearVoiceChatTimer();

    if (chatVoiceMode === "auto") {
      voiceChatTimerRef.current =
        window.setTimeout(() => {
          flushVoiceChatDraft(result);
        }, VOICE_TO_CHAT_PAUSE_MS);
    }
  };


  useEffect(() => {
    return () => {
      clearVoiceChatTimer();
    };
  }, []);


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

      queueVoiceChatTranscript(result);

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
    <div className="w-full rounded-xl border border-purple-500/70 p-2">
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
              : "bg-green-600 hover:bg-green-700",
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
            setShowAdminOptions(true);
          }}
          className={[
            "shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition",
            "bg-slate-600 hover:bg-slate-700",
          ].join(" ")}
        >
          See admin options
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            if (chatVoiceMode === "off") {
              setChatVoiceMode("auto");
            } else {
              setChatVoiceMode("off");
              clearVoiceChatDraft();
            }
          }}
          className={[
            "rounded-lg px-3 py-2 text-xs font-bold text-white transition",
            chatVoiceMode === "off"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700",
          ].join(" ")}
        >
          Voice ChatBot:{" "}
          {chatVoiceMode === "off"
            ? "Off"
            : "On"}
        </button>

        <button
          type="button"
          onClick={() =>
            setShowChatVoiceSettings(true)
          }
          className="rounded-lg border border-purple-300 bg-black px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-500 hover:text-black"
        >
          ChatBot voice conversation settings
        </button>
      </div>

      <Dialog
        isOpen={showAdminOptions}
        toggleDialog={() =>
          setShowAdminOptions(false)
        }
      >
        <div className="flex max-h-[88vh] w-[min(94vw,860px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">
              Admin options
            </h2>

            <button
              type="button"
              onClick={() =>
                setShowAdminOptions(false)
              }
              className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-auto">
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
              <button
                type="button"
                onClick={() =>
                  setTechnicalMode(
                    (current) => !current
                  )
                }
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
                onClick={() =>
                  setSemanticEnabled(
                    (current) => !current
                  )
                }
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
                onClick={() =>
                  setAdvancedReasoningEnabled(
                    (current) => !current
                  )
                }
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

            {isSemanticModelBusy && (
              <div className="mt-3 rounded-lg bg-zinc-950 px-3 py-2 text-[11px] font-semibold text-white">
                Semantic ML is loading or comparing meaning...
              </div>
            )}

            <div className="mt-3 rounded-xl border border-zinc-700 bg-black p-3 text-xs text-white shadow-sm">
              <div className="grid gap-2">
                <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                    Student said
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {lastResult
                      ? `"${lastResult.transcript || lastTranscript}"`
                      : ""}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                    Robot interpreted
                  </div>
                  <div className="mt-1 text-base font-bold text-white">
                    {lastResult
                      ? friendlyIntentLabel(
                          lastResult
                        )
                      : ""}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                    Why
                  </div>
                  <div className="mt-1 leading-5 text-white">
                    {lastResult
                      ? demoWhyText(
                          lastResult
                        )
                      : ""}
                  </div>
                </div>
              </div>
            </div>

            {lastResult && technicalMode && (
              <div className="mt-3 rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
                <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 leading-5 text-white">
                  <span className="font-semibold">
                    Reason:
                  </span>{" "}
                  {lastResult.confidenceLabel}
                  {lastResult.decisionReason
                    ? ` · decision ${lastResult.decisionReason}`
                    : ""}
                </div>
              </div>
            )}

            {(errorMessage || commandError) && (
              <div className="mt-3 rounded bg-red-950 px-2 py-1 text-xs font-semibold text-white">
                {errorMessage || commandError}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={showChatVoiceSettings}
        toggleDialog={() =>
          setShowChatVoiceSettings(false)
        }
      >
        <div className="flex max-h-[88vh] w-[min(94vw,700px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold">
              ChatBot voice conversation settings
            </h2>

            <button
              type="button"
              onClick={() =>
                setShowChatVoiceSettings(false)
              }
              className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="grid gap-3 text-xs">
            <label className="grid gap-1">
              <span className="font-bold text-zinc-300">
                Chat voice mode
              </span>

              <select
                value={chatVoiceMode}
                onChange={(event) => {
                  setChatVoiceMode(
                    event.target
                      .value as ChatVoiceMode
                  );

                  clearVoiceChatDraft();
                }}
                className="rounded border border-zinc-700 bg-black px-2 py-2 text-white"
              >
                <option
                  value="auto"
                  className="bg-black text-white"
                >
                  Auto after pause
                </option>
                <option
                  value="manual"
                  className="bg-black text-white"
                >
                  Manual send
                </option>
                <option
                  value="off"
                  className="bg-black text-white"
                >
                  Off
                </option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  !voiceChatCleanDraft.trim() ||
                  chatVoiceMode === "off"
                }
                onClick={() => {
                  flushVoiceChatDraft(
                    lastResult ?? undefined
                  );
                }}
                className={[
                  "rounded-lg px-2 py-2 font-bold text-white transition",
                  voiceChatCleanDraft.trim() &&
                  chatVoiceMode !== "off"
                    ? "bg-pink-600 hover:bg-pink-500"
                    : "cursor-not-allowed bg-slate-700 opacity-50",
                ].join(" ")}
              >
                Send voice to chat
              </button>

              <button
                type="button"
                disabled={
                  !voiceChatDraft.trim() &&
                  !voiceChatCleanDraft.trim()
                }
                onClick={clearVoiceChatDraft}
                className={[
                  "rounded-lg px-2 py-2 font-bold text-white transition",
                  voiceChatDraft.trim() ||
                  voiceChatCleanDraft.trim()
                    ? "bg-slate-600 hover:bg-slate-500"
                    : "cursor-not-allowed bg-slate-700 opacity-50",
                ].join(" ")}
              >
                Clear draft
              </button>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 leading-5">
              <span className="font-bold text-zinc-300">
                Raw voice draft:
              </span>{" "}
              {voiceChatDraft || ""}
            </div>

            <div className="rounded-lg border border-emerald-700 bg-zinc-950 px-3 py-2 leading-5">
              <span className="font-bold text-emerald-300">
                Cleaned voice draft:
              </span>{" "}
              {voiceChatCleanDraft || ""}
            </div>
          </div>
        </div>
      </Dialog>

      {false && showAdminOptions && (
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

          <div className="mt-2 grid gap-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-[11px] text-white">
            <div className="grid grid-cols-3 gap-2">
              <label className="grid gap-1">
                <span className="font-bold text-zinc-300">
                  Chat voice mode
                </span>

                <select
                  value={chatVoiceMode}
                  onChange={(event) => {
                    setChatVoiceMode(
                      event.target
                        .value as ChatVoiceMode
                    );

                    clearVoiceChatDraft();
                  }}
                  className="rounded border border-zinc-700 bg-black px-2 py-1 text-white"
                >
                  <option
                    value="auto"
                    className="bg-black text-white"
                  >
                    Auto after pause
                  </option>
                  <option
                    value="manual"
                    className="bg-black text-white"
                  >
                    Manual send
                  </option>
                  <option
                    value="off"
                    className="bg-black text-white"
                  >
                    Off
                  </option>
                </select>
              </label>

              <button
                type="button"
                disabled={
                  !voiceChatCleanDraft.trim() ||
                  chatVoiceMode === "off"
                }
                onClick={() => {
                  flushVoiceChatDraft(
                    lastResult ?? undefined
                  );
                }}
                className={[
                  "rounded-lg px-2 py-1.5 font-bold text-white transition",
                  voiceChatCleanDraft.trim() &&
                  chatVoiceMode !== "off"
                    ? "bg-pink-600 hover:bg-pink-500"
                    : "cursor-not-allowed bg-slate-700 opacity-50",
                ].join(" ")}
              >
                Send voice to chat
              </button>

              <button
                type="button"
                disabled={
                  !voiceChatDraft.trim() &&
                  !voiceChatCleanDraft.trim()
                }
                onClick={clearVoiceChatDraft}
                className={[
                  "rounded-lg px-2 py-1.5 font-bold text-white transition",
                  voiceChatDraft.trim() ||
                  voiceChatCleanDraft.trim()
                    ? "bg-slate-600 hover:bg-slate-500"
                    : "cursor-not-allowed bg-slate-700 opacity-50",
                ].join(" ")}
              >
                Clear draft
              </button>
            </div>

            <div className="grid gap-2">
              <div className="rounded-lg border border-zinc-700 bg-black px-2 py-1.5 leading-5">
                <span className="font-bold text-zinc-300">
                  Raw voice draft:
                </span>{" "}
                {voiceChatDraft || "—"}
              </div>

              <div className="rounded-lg border border-emerald-700 bg-black px-2 py-1.5 leading-5">
                <span className="font-bold text-emerald-300">
                  Cleaned voice draft:
                </span>{" "}
                {voiceChatCleanDraft || "—"}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-zinc-950 px-2 py-1.5 text-[11px] leading-5 text-white">
            Try a full sentence: I'm from Colombia and yesterday Colombia lost its match ·
            My name is Robert, I'm 12 years old, and I like soccer · I had a bad exam · move back
          </div>
        </div>
      )}

      {false && showAdminOptions && isSemanticModelBusy && (
        <div className="mt-2 rounded-lg bg-black px-2 py-1.5 text-[11px] font-semibold text-white">
          Semantic ML is loading or comparing meaning...
        </div>
      )}

      {lastResult && false && showAdminOptions && !technicalMode && (
        <div className="mt-2 rounded-xl border border-zinc-700 bg-black p-3 text-xs text-white shadow-sm">
          <div className="grid gap-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Student said
              </div>
              <div className="mt-1 font-semibold text-white">
                "{lastResult?.transcript || lastTranscript}"
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
                  lastResult?.source ?? "unknown"
                )}
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white">
                <span className="font-bold">
                  Robot action:
                </span>{" "}
                {actionLabel(
                  lastResult?.action ?? "unknown"
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {lastResult && false && showAdminOptions && technicalMode && (
        <div className="mt-2 rounded-xl border border-zinc-700 bg-black p-2 text-[11px] text-white">
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Source
              </div>
              <div className="font-bold">
                {sourceLabel(
                  lastResult?.source ?? "unknown"
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Detected intent
              </div>
              <div className="font-bold">
                {lastResult?.intentLabel}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Confidence
              </div>
              <div className="font-bold">
                {confidencePercent}% ·{" "}
                {confidenceLabel(
                  lastResult?.confidenceScore ?? 0
                )}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-white">
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                Category
              </div>
              <div className="font-bold capitalize">
                {lastResult?.intentCategory}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 leading-5 text-white">
            <span className="font-semibold">
              Reason:
            </span>{" "}
            {lastResult?.confidenceLabel}

            {lastResult?.decisionReason && (
              <>
                {" "}· decision{" "}
                <span className="font-semibold">
                  {lastResult?.decisionReason}
                </span>
              </>
            )}

            {(lastResult?.repeatCount ?? 0) > 1 && (
              <>
                {" "}· repeat x
                {lastResult?.repeatCount}
              </>
            )}

            {lastResult?.advancedMatchedPrototype && (
              <>
                {" "}· advanced prototype{" "}
                <span className="font-semibold">
                  "{lastResult?.advancedMatchedPrototype}"
                </span>
              </>
            )}

            {lastResult?.contextReason && (
              <>
                {" "}· context{" "}
                <span className="font-semibold">
                  {lastResult?.contextReason}
                </span>
              </>
            )}

            {lastResult?.semanticMatchText && (
              <>
                {" "}· closest example{" "}
                <span className="font-semibold">
                  "{lastResult?.semanticMatchText}"
                </span>
              </>
            )}

            {typeof lastResult?.semanticSimilarity === "number" && (
              <>
                {" "}· similarity{" "}
                {lastResult?.semanticSimilarity?.toFixed(2)}
              </>
            )}

            {lastResult?.matchedRuleId && (
              <>
                {" "}· rule{" "}
                <span className="font-mono">
                  {lastResult?.matchedRuleId}
                </span>
              </>
            )}
          </div>

          {(lastResult?.decisionCandidates?.length ?? 0) >
            0 && (
              <div className="mt-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-white">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Decision candidates
                </div>

                <div className="grid gap-1">
                  {lastResult?.decisionCandidates?.map(
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

      {false && showAdminOptions && (errorMessage || commandError) && (
        <div className="mt-2 rounded bg-red-950 px-2 py-1 text-xs font-semibold text-white">
          {errorMessage || commandError}
        </div>
      )}
    </div>
  );
}


export default VoiceCommandPanel;
