import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  isRepeatableEmotionAction,
} from "./emotionIntentEngine";

import {
  classifyVoiceCommandWithSemantic,
  warmupSemanticEmotionModel,
} from "./semanticEmotionEngine";

import {
  warmupAdvancedEmotionReasoner,
} from "./advancedEmotionReasoner";

import {
  findMatchingCustomEmotionKeyword,
  getEmotionOptionByKey,
  type CustomEmotionKeywordMatch,
} from "../keywords/customEmotionKeywordStore";
  

import type {
  VoiceCommandAction,
  VoiceCommandResult,
} from "./voiceCommandTypes";

export type {
  VoiceCommandAction,
  VoiceCommandResult,
} from "./voiceCommandTypes";


type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;

  onerror:
    | ((
        event: {
          error?: string;
          message?: string;
        }
      ) => void)
    | null;

  onresult:
    | ((
        event: {
          results: ArrayLike<
            {
              isFinal?: boolean;
              0?: {
                transcript?: string;
              };
            }
          >;
        }
      ) => void)
    | null;
};


type SpeechRecognitionConstructor =
  new () => SpeechRecognitionLike;


type WindowWithSpeechRecognition =
  Window & {
    SpeechRecognition?:
      SpeechRecognitionConstructor;

    webkitSpeechRecognition?:
      SpeechRecognitionConstructor;
  };


export type SemanticModelStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";


export interface UseVoiceCommandsOptions {
  cooldownMs?: number;
  semanticEnabled?: boolean;
  advancedReasoningEnabled?: boolean;

  onCommand?: (
    result: VoiceCommandResult
  ) => void | Promise<void>;
}


export interface UseVoiceCommandsResult {
  isSupported: boolean;
  isListening: boolean;
  isSemanticModelBusy: boolean;
  semanticModelStatus: SemanticModelStatus;
  lastTranscript: string;
  lastAction: VoiceCommandAction | null;
  lastResult: VoiceCommandResult | null;
  errorMessage: string;

  preloadSemanticModel: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
}


function getSpeechRecognitionConstructor():
  SpeechRecognitionConstructor | null {
  const speechWindow =
    window as WindowWithSpeechRecognition;

  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}


function actionForCustomKeyword(
  emotionKey: string
): VoiceCommandAction {
  switch (emotionKey) {
    case "idle":
      return "turn_idle";

    case "happy":
      return "turn_happy";

    case "sad":
      return "turn_sad";

    case "excited":
      return "turn_excited";

    case "in_love":
      return "turn_in_love";

    case "upset":
      return "turn_upset";

    default:
      return "unknown";
  }
}


function createCustomVoiceKeywordResult(
  transcript: string,
  match: CustomEmotionKeywordMatch
): VoiceCommandResult {
  const emotionOption =
    getEmotionOptionByKey(
      match.rule.emotionKey
    );

  return {
    transcript:
      transcript.trim(),

    action:
      actionForCustomKeyword(
        match.rule.emotionKey
      ),

    confidenceLabel:
      `Custom voice keyword matched "${match.rule.phrase}".`,

    repeatCount:
      1,

    source:
      "custom_voice_keyword" as VoiceCommandResult["source"],

    matchedRuleId:
      `custom_voice_keyword.${match.rule.id}`,

    intentLabel:
      emotionOption.label,

    intentCategory:
      "emotion",

    confidenceScore:
      Math.min(
        Math.max(
          match.rule.priority / 100,
          0.65
        ),
        0.99
      ),

    contextReason:
      `The spoken phrase matched the custom voice keyword "${match.rule.phrase}", so the robot selected ${emotionOption.label}.`,

    decisionReason:
      `Custom voice keyword "${match.rule.phrase}" has priority over the default voice intent engine.`,
  };
}


export function useVoiceCommands(
  options: UseVoiceCommandsOptions = {}
): UseVoiceCommandsResult {
  const optionsRef =
    useRef(options);

  optionsRef.current =
    options;

  const recognitionRef =
    useRef<
      SpeechRecognitionLike | null
    >(null);

  const classifyRequestIdRef =
    useRef(0);

  const lastSentAtRef =
    useRef(0);

  const lastSentActionRef =
    useRef<
      VoiceCommandAction | null
    >(null);

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [
    isSemanticModelBusy,
    setIsSemanticModelBusy,
  ] = useState(false);

  const [
    semanticModelStatus,
    setSemanticModelStatus,
  ] = useState<SemanticModelStatus>(
    "idle"
  );

  const [
    lastTranscript,
    setLastTranscript,
  ] = useState("");

  const [
    lastResult,
    setLastResult,
  ] = useState<
    VoiceCommandResult | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const isSupported =
    getSpeechRecognitionConstructor() !==
    null;

  const preloadSemanticModel =
    useCallback(async (): Promise<void> => {
      setErrorMessage("");
      setSemanticModelStatus(
        "loading"
      );
      setIsSemanticModelBusy(true);

      try {
        await Promise.all([
          warmupSemanticEmotionModel(),
          warmupAdvancedEmotionReasoner(),
        ]);

        setSemanticModelStatus(
          "ready"
        );
      } catch (error) {
        setSemanticModelStatus(
          "error"
        );

        setErrorMessage(
          error instanceof Error
            ? `Semantic ML could not load: ${error.message}`
            : "Semantic ML could not load."
        );
      } finally {
        setIsSemanticModelBusy(false);
      }
    }, []);

  const stopListening =
    useCallback(() => {
      const recognition =
        recognitionRef.current;

      if (recognition) {
        try {
          recognition.stop();
        } catch {
          recognition.abort();
        }
      }

      recognitionRef.current = null;
      setIsListening(false);
    }, []);

  const handleTranscript =
    useCallback(
      async (
        transcript: string
      ): Promise<void> => {
        const trimmedTranscript =
          transcript.trim();

        if (!trimmedTranscript) {
          return;
        }

        const requestId =
          classifyRequestIdRef.current + 1;

        classifyRequestIdRef.current =
          requestId;

        setLastTranscript(
          trimmedTranscript
        );

        let result:
          VoiceCommandResult;

        /*
         * Custom voice keywords are checked first.
         *
         * Example:
         * - Teacher/student adds: electricity -> Excited
         * - Microphone hears: "electricity"
         * - Robot immediately selects Excited without needing
         *   semantic ML or hardcoded intent rules.
         */
        const customVoiceKeywordMatch =
          findMatchingCustomEmotionKeyword(
            trimmedTranscript
          );

        if (customVoiceKeywordMatch) {
          result =
            createCustomVoiceKeywordResult(
              trimmedTranscript,
              customVoiceKeywordMatch
            );
        } else {
          const semanticEnabled =
            optionsRef.current.semanticEnabled ??
            true;

          const advancedReasoningEnabled =
            optionsRef.current.advancedReasoningEnabled ??
            false;

          if (
            semanticEnabled &&
            semanticModelStatus !== "ready"
          ) {
            setIsSemanticModelBusy(true);
          }

          try {
            result =
              await classifyVoiceCommandWithSemantic(
                trimmedTranscript,
                {
                  semanticEnabled,
                  advancedReasoningEnabled,
                }
              );

            if (
              result.source === "semantic_ml"
            ) {
              setSemanticModelStatus(
                "ready"
              );
            }
          } finally {
            if (
              classifyRequestIdRef.current ===
              requestId
            ) {
              setIsSemanticModelBusy(false);
            }
          }
        }

        if (
          classifyRequestIdRef.current !==
          requestId
        ) {
          return;
        }

        setLastResult(
          result
        );

        if (
          result.action === "unknown"
        ) {
          return;
        }

        const now =
          Date.now();

        const cooldownMs =
          optionsRef.current.cooldownMs ??
          700;

        const isDuplicateTooSoon =
          !isRepeatableEmotionAction(
            result.action
          ) &&
          lastSentActionRef.current ===
            result.action &&
          now - lastSentAtRef.current <
            cooldownMs;

        if (isDuplicateTooSoon) {
          return;
        }

        lastSentActionRef.current =
          result.action;

        lastSentAtRef.current =
          now;

        void optionsRef.current.onCommand?.(
          result
        );
      },
      [
        semanticModelStatus,
      ]
    );

  const startListening =
    useCallback(() => {
      setErrorMessage("");

      const RecognitionConstructor =
        getSpeechRecognitionConstructor();

      if (!RecognitionConstructor) {
        setErrorMessage(
          "Speech recognition is not available in this browser. Try Chrome."
        );

        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          recognitionRef.current.abort();
        }
      }

      const recognition =
        new RecognitionConstructor();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onerror = (event) => {
        setErrorMessage(
          event.error
            ? `Voice recognition error: ${event.error}`
            : "Voice recognition error."
        );

        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const results =
          Array.from(event.results);

        const latest =
          results[results.length - 1];

        const transcript =
          latest?.[0]?.transcript ?? "";

        void handleTranscript(
          transcript
        );
      };

      recognitionRef.current =
        recognition;

      recognition.start();
    }, [handleTranscript]);

  return {
    isSupported,
    isListening,
    isSemanticModelBusy,
    semanticModelStatus,
    lastTranscript,

    lastAction:
      lastResult?.action ??
      null,

    lastResult,
    errorMessage,

    preloadSemanticModel,
    startListening,
    stopListening,
  };
}
