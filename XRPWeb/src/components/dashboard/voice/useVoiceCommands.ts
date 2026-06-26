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


export type VoiceCommandAction =
  | "turn_right"
  | "turn_left"
  | "turn_back"
  | "turn_happy"
  | "turn_sad"
  | "turn_excited"
  | "turn_in_love"
  | "stop"
  | "showtime"
  | "go_to_sleep"
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


function hasAnyToken(
  tokens: Set<string>,
  words: string[]
): boolean {
  return words.some((word) =>
    tokens.has(word)
  );
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
   * Safety / macro commands first.
   * They must be checked before generic emotion phrases.
   */
  if (
    normalized === "stop" ||
    normalized.includes(
      "stop robot"
    ) ||
    normalized.includes(
      "stop moving"
    ) ||
    normalized.includes(
      "emergency stop"
    ) ||
    normalized.includes(
      "freeze"
    ) ||
    normalized.includes(
      "detente"
    ) ||
    normalized.includes(
      "para"
    )
  ) {
    action = "stop";
    confidenceLabel = "Direct stop command";
  } else if (
    normalized.includes(
      "showtime"
    ) ||
    normalized.includes(
      "show time"
    ) ||
    normalized.includes(
      "its showtime"
    ) ||
    normalized.includes(
      "its show time"
    ) ||
    normalized.includes(
      "it is showtime"
    ) ||
    normalized.includes(
      "it is show time"
    ) ||
    normalized.includes(
      "start show"
    ) ||
    normalized.includes(
      "demo mode"
    ) ||
    normalized.includes(
      "do a dance"
    ) ||
    normalized === "dance"
  ) {
    action = "showtime";
    confidenceLabel = "Direct showtime command";
  } else if (
    normalized.includes(
      "go to sleep"
    ) ||
    normalized.includes(
      "go sleep"
    ) ||
    normalized.includes(
      "sleep mode"
    ) ||
    normalized === "sleep" ||
    normalized.includes(
      "good night"
    ) ||
    normalized.includes(
      "goodnight"
    )
  ) {
    action = "go_to_sleep";
    confidenceLabel = "Direct sleep command";
  } else if (
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
    confidenceLabel = "Direct movement command";
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
    confidenceLabel = "Direct movement command";
  } else if (
    normalized.includes(
      "move back"
    ) ||
    normalized.includes(
      "go back"
    ) ||
    normalized.includes(
      "move backward"
    ) ||
    normalized.includes(
      "back up"
    ) ||
    normalized.includes(
      "turn back"
    ) ||
    normalized === "back" ||
    normalized.includes(
      "reversa"
    ) ||
    normalized.includes(
      "atrás"
    ) ||
    normalized.includes(
      "atras"
    )
  ) {
    action = "turn_back";
    confidenceLabel = "Direct movement command";
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
      "turn in love"
    ) ||
    normalized.includes(
      "in love"
    ) ||
    normalized.includes(
      "be in love"
    ) ||
    normalized.includes(
      "enamorado"
    ) ||
    normalized.includes(
      "enamorada"
    )
  ) {
    action = "turn_in_love";
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

    const inLoveWords = [
      "im",
      "i",
      "am",
      "really",
      "very",
      "so",
      "happy",
      "like",
      "love",
      "work",
      "working",
      "with",
      "you",
      "xrp",
      "today",
      "hoy",
      "estoy",
      "muy",
      "feliz",
    ];

    const inLoveScore =
      scoreTokens(
        tokens,
        inLoveWords
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

    const looksLikeInLove =
      normalized.includes(
        "im happy"
      ) ||
      normalized.includes(
        "i am happy"
      ) ||
      normalized.includes(
        "im really happy"
      ) ||
      normalized.includes(
        "i am really happy"
      ) ||
      normalized.includes(
        "im very happy"
      ) ||
      normalized.includes(
        "i am very happy"
      ) ||
      normalized.includes(
        "i like to work with you"
      ) ||
      normalized.includes(
        "i like working with you"
      ) ||
      normalized.includes(
        "i love working with you"
      ) ||
      normalized.includes(
        "i love to work with you"
      ) ||
      normalized.includes(
        "hoy estoy muy feliz"
      ) ||
      normalized.includes(
        "estoy muy feliz"
      ) ||
      (
        tokens.has("happy") &&
        inLoveScore >= 2
      ) ||
      (
        tokens.has("like") &&
        (
          tokens.has("work") ||
          tokens.has("working")
        ) &&
        tokens.has("you")
      ) ||
      (
        tokens.has("love") &&
        (
          tokens.has("work") ||
          tokens.has("working")
        ) &&
        tokens.has("you")
      ) ||
      (
        tokens.has("feliz") &&
        inLoveScore >= 3
      );

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
    } else if (looksLikeInLove) {
      action = "turn_in_love";
      confidenceLabel =
        `Phrase matched: very happy/in-love (${inLoveScore} keyword matches)`;
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

          console.log(
  "[voice] heard:",
  transcript.trim(),
  "=>",
  result.action,
  result.confidenceLabel
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
