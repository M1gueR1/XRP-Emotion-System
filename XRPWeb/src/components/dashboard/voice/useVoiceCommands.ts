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
  | "turn_excited"
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
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9áéíóúñü\s]/g, " ")
    .replace(/\s+/g, " ");
}


function hasAnyToken(
  tokens: Set<string>,
  words: string[]
): boolean {
  return words.some((word) =>
    tokens.has(word)
  );
}


function scoreTokens(
  tokens: Set<string>,
  words: string[]
): number {
  let score = 0;

  for (const word of words) {
    if (tokens.has(word)) {
      score += 1;
    }
  }

  return score;
}


export function classifyVoiceCommand(
  transcript: string
): VoiceCommandResult {
  const normalized =
    normalizeTranscript(
      transcript
    );

  const tokenList =
    normalized
      .split(" ")
      .filter(Boolean);

  const tokens =
    new Set(tokenList);

  let action:
    VoiceCommandAction =
      "unknown";

  let confidenceLabel =
    "No matching command";

  /*
   * Order matters:
   * - Direction commands first.
   * - Direct emotion commands next.
   * - Phrase/intention commands after that.
   *
   * We use phrase matching + token scoring so the user
   * does not need to say the exact full sentence.
   */

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
    confidenceLabel = "Direct direction command";
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
    confidenceLabel = "Direct direction command";
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
    confidenceLabel = "Direct emotion command";
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
    confidenceLabel = "Direct emotion command";
  } else if (
    normalized.includes(
      "turn excited"
    ) ||
    normalized.includes(
      "be excited"
    ) ||
    normalized === "excited" ||
    normalized.includes(
      "emocionado"
    )
  ) {
    action = "turn_excited";
    confidenceLabel = "Direct emotion command";
  } else {
    const readyWords = [
      "are",
      "you",
      "ready",
      "for",
      "today",
      "listo",
      "lista",
      "hoy",
    ];

    const readyScore =
      scoreTokens(
        tokens,
        readyWords
      );

    const greetingWords = [
      "hi",
      "hello",
      "hey",
      "xrp",
      "how",
      "are",
      "you",
      "doing",
      "whats",
      "what",
      "up",
      "hola",
      "como",
      "estas",
    ];

    const greetingScore =
      scoreTokens(
        tokens,
        greetingWords
      );

    const looksLikeReady =
      normalized.includes(
        "are you ready"
      ) ||
      normalized.includes(
        "ready for today"
      ) ||
      (
        tokens.has("ready") &&
        readyScore >= 2
      ) ||
      readyScore >= 3;

    const looksLikeGreeting =
      normalized.includes(
        "hello xrp"
      ) ||
      normalized.includes(
        "hi xrp"
      ) ||
      normalized.includes(
        "hey xrp"
      ) ||
      normalized.includes(
        "how are you"
      ) ||
      normalized.includes(
        "whats up"
      ) ||
      normalized.includes(
        "what up"
      ) ||
      tokens.has("hello") ||
      tokens.has("hi") ||
      tokens.has("hey") ||
      (
        hasAnyToken(
          tokens,
          ["xrp", "you"]
        ) &&
        greetingScore >= 3
      ) ||
      greetingScore >= 4;

    if (looksLikeReady) {
      action = "turn_excited";
      confidenceLabel =
        `Phrase matched: ready/excited (${readyScore} keyword matches)`;
    } else if (looksLikeGreeting) {
      action = "turn_happy";
      confidenceLabel =
        `Phrase matched: greeting/happy (${greetingScore} keyword matches)`;
    }
  }

  return {
    transcript:
      normalized,

    action,

    confidenceLabel,
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

      /*
       * Interim results reduce latency:
       * the phrase can trigger as soon as enough
       * words are recognized, without waiting for
       * the full sentence to finish.
       */
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
          700;

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
