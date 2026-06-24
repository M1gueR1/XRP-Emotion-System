import {
  useCallback,
  useRef,
  useState,
} from "react";


type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart:
    | (() => void)
    | null;

  onend:
    | (() => void)
    | null;

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


export type VoiceCommandAction =
  | "turn_right"
  | "turn_left"
  | "turn_happy"
  | "turn_sad"
  | "unknown";


export interface VoiceCommandResult {
  transcript: string;
  action: VoiceCommandAction;
  confidenceLabel: string;
}


export interface UseVoiceCommandsOptions {
  cooldownMs?: number;

  onCommand?: (
    result: VoiceCommandResult
  ) => void | Promise<void>;
}


export interface UseVoiceCommandsResult {
  isSupported: boolean;
  isListening: boolean;
  lastTranscript: string;
  lastAction: VoiceCommandAction | null;
  lastResult: VoiceCommandResult | null;
  errorMessage: string;

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


function normalizeTranscript(
  transcript: string
): string {
  return transcript
    .trim()
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}


export function classifyVoiceCommand(
  transcript: string
): VoiceCommandResult {
  const normalized =
    normalizeTranscript(
      transcript
    );

  let action:
    VoiceCommandAction =
      "unknown";

  if (
    normalized.includes(
      "turn to the right"
    ) ||
    normalized.includes(
      "turn right"
    ) ||
    normalized === "right" ||
    normalized.includes(
      "gira a la derecha"
    ) ||
    normalized.includes(
      "derecha"
    )
  ) {
    action = "turn_right";
  } else if (
    normalized.includes(
      "turn to the left"
    ) ||
    normalized.includes(
      "turn left"
    ) ||
    normalized === "left" ||
    normalized.includes(
      "gira a la izquierda"
    ) ||
    normalized.includes(
      "izquierda"
    )
  ) {
    action = "turn_left";
  } else if (
    normalized.includes(
      "turn happy"
    ) ||
    normalized.includes(
      "be happy"
    ) ||
    normalized === "happy" ||
    normalized.includes(
      "feliz"
    )
  ) {
    action = "turn_happy";
  } else if (
    normalized.includes(
      "turn sad"
    ) ||
    normalized.includes(
      "be sad"
    ) ||
    normalized === "sad" ||
    normalized.includes(
      "triste"
    )
  ) {
    action = "turn_sad";
  }

  return {
    transcript:
      normalized,

    action,

    confidenceLabel:
      action === "unknown"
        ? "No matching command"
        : "Command recognized",
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
      recognition.interimResults = false;
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

        if (!transcript.trim()) {
          return;
        }

        const result =
          classifyVoiceCommand(
            transcript
          );

        setLastTranscript(
          transcript.trim()
        );

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
          800;

        const isDuplicateTooSoon =
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
      };

      recognitionRef.current =
        recognition;

      recognition.start();
    }, []);

  return {
    isSupported,
    isListening,
    lastTranscript,

    lastAction:
      lastResult?.action ??
      null,

    lastResult,
    errorMessage,

    startListening,
    stopListening,
  };
}
