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
  | "lets_play"
  | "unknown";


export interface VoiceCommandResult {
  transcript: string;
  action: VoiceCommandAction;
  confidenceLabel: string;
  repeatCount: number;
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


function countWordOccurrences(
  words: string[],
  targetWords: string[]
): number {
  const targets =
    new Set(targetWords);

  return words.filter((word) =>
    targets.has(word)
  ).length;
}


function repeatedEmotionCount(
  words: string[],
  targetWords: string[]
): number {
  return Math.min(
    Math.max(
      countWordOccurrences(
        words,
        targetWords
      ),
      1
    ),
    3
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

  let repeatCount = 1;

  /*
   * Safety / macro commands first.
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
      "lets play"
    ) ||
    normalized.includes(
      "let us play"
    ) ||
    normalized.includes(
      "lets do a challenge"
    ) ||
    normalized.includes(
      "lets go to the challenge"
    ) ||
    normalized.includes(
      "go to the challenge"
    ) ||
    normalized.includes(
      "start challenge"
    ) ||
    normalized === "challenge"
  ) {
    action = "lets_play";
    confidenceLabel = "Challenge/play command";
  } else if (
    normalized.includes(
      "showtime"
    ) ||
    normalized.includes(
      "show time"
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
    normalized.includes(
      "dance"
    )
  ) {
    action = "showtime";
    confidenceLabel = "Showtime macro command";
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
      "buenas noches"
    ) ||
    normalized.includes(
      "duermete"
    )
  ) {
    action = "go_to_sleep";
    confidenceLabel = "Sleep macro command";
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
    normalized.includes(
      "i am sad"
    ) ||
    normalized.includes(
      "im sad"
    ) ||
    normalized.includes(
      "i feel sad"
    ) ||
    normalized.includes(
      "today i had a sad day"
    ) ||
    normalized.includes(
      "today i had a bad day"
    ) ||
    normalized.includes(
      "i had a bad day"
    ) ||
    normalized.includes(
      "bad day"
    ) ||
    normalized.includes(
      "sad day"
    ) ||
    normalized.includes(
      "i feel bad"
    ) ||
    normalized.includes(
      "i am upset"
    ) ||
    normalized.includes(
      "im upset"
    ) ||
    normalized === "sad" ||
    normalized.includes(
      "sad sad"
    ) ||
    normalized.includes(
      "triste"
    )
  ) {
    action = "turn_sad";
    repeatCount = repeatedEmotionCount(
      tokenList,
      ["sad", "triste"]
    );
    confidenceLabel =
      repeatCount > 1
        ? `Repeated sad command x${repeatCount}`
        : "Sad emotion phrase";
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
      "love love"
    ) ||
    normalized.includes(
      "you are my friend"
    ) ||
    normalized.includes(
      "youre my friend"
    ) ||
    normalized.includes(
      "you are my best friend"
    ) ||
    normalized.includes(
      "youre my best friend"
    ) ||
    normalized.includes(
      "i like you"
    ) ||
    normalized.includes(
      "i love you"
    ) ||
    normalized.includes(
      "my friend"
    ) ||
    normalized.includes(
      "best friend"
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
      "enamorado"
    ) ||
    normalized.includes(
      "enamorada"
    )
  ) {
    action = "turn_in_love";
    repeatCount = repeatedEmotionCount(
      tokenList,
      [
        "love",
        "friend",
        "enamorado",
        "enamorada",
      ]
    );
    confidenceLabel =
      repeatCount > 1
        ? `Repeated in-love command x${repeatCount}`
        : "In-love/friend phrase";
  } else if (
    normalized.includes(
      "turn happy"
    ) ||
    normalized.includes(
      "be happy"
    ) ||
    normalized.includes(
      "i feel happy"
    ) ||
    normalized.includes(
      "i feel good"
    ) ||
    normalized.includes(
      "i feel great"
    ) ||
    normalized.includes(
      "today is a good day"
    ) ||
    normalized.includes(
      "today is a happy day"
    ) ||
    normalized.includes(
      "good day"
    ) ||
    normalized.includes(
      "great day"
    ) ||
    normalized.includes(
      "happy happy"
    ) ||
    normalized === "happy" ||
    normalized === "xrp" ||
    normalized === "x r p" ||
    normalized === "ex ar pee" ||
    normalized === "ecs ar pi" ||
    normalized.includes(
      "feliz"
    )
  ) {
    action = "turn_happy";
    repeatCount = repeatedEmotionCount(
      tokenList,
      ["happy", "feliz"]
    );
    confidenceLabel =
      repeatCount > 1
        ? `Repeated happy command x${repeatCount}`
        : "Happy emotion phrase";
  } else if (
    normalized.includes(
      "turn excited"
    ) ||
    normalized.includes(
      "be excited"
    ) ||
    normalized.includes(
      "i am excited"
    ) ||
    normalized.includes(
      "im excited"
    ) ||
    normalized.includes(
      "lets get excited"
    ) ||
    normalized.includes(
      "this is amazing"
    ) ||
    normalized.includes(
      "this is awesome"
    ) ||
    normalized.includes(
      "wow"
    ) ||
    normalized.includes(
      "excited excited"
    ) ||
    normalized === "excited" ||
    normalized.includes(
      "emocionado"
    )
  ) {
    action = "turn_excited";
    repeatCount = repeatedEmotionCount(
      tokenList,
      [
        "excited",
        "wow",
        "emocionado",
      ]
    );
    confidenceLabel =
      repeatCount > 1
        ? `Repeated excited command x${repeatCount}`
        : "Excited emotion phrase";
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
      "friend",
      "best",
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

    const sadWords = [
      "today",
      "i",
      "had",
      "a",
      "sad",
      "bad",
      "day",
      "feel",
      "upset",
      "triste",
    ];

    const sadScore =
      scoreTokens(
        tokens,
        sadWords
      );

    const happyWords = [
      "xrp",
      "happy",
      "good",
      "great",
      "day",
      "feel",
      "hello",
      "hi",
      "hey",
      "feliz",
    ];

    const happyScore =
      scoreTokens(
        tokens,
        happyWords
      );

    const excitedWords = [
      "ready",
      "excited",
      "amazing",
      "awesome",
      "wow",
      "challenge",
      "today",
    ];

    const excitedScore =
      scoreTokens(
        tokens,
        excitedWords
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
        "you are my friend"
      ) ||
      normalized.includes(
        "youre my friend"
      ) ||
      normalized.includes(
        "i like you"
      ) ||
      normalized.includes(
        "i love you"
      ) ||
      (
        tokens.has("friend") &&
        inLoveScore >= 3
      ) ||
      (
        tokens.has("love") &&
        inLoveScore >= 2
      ) ||
      (
        tokens.has("happy") &&
        inLoveScore >= 3
      ) ||
      (
        tokens.has("feliz") &&
        inLoveScore >= 3
      );

    const looksLikeSad =
      normalized.includes(
        "today i had a sad day"
      ) ||
      normalized.includes(
        "today i had a bad day"
      ) ||
      normalized.includes(
        "i had a bad day"
      ) ||
      normalized.includes(
        "sad day"
      ) ||
      normalized.includes(
        "bad day"
      ) ||
      (
        tokens.has("sad") &&
        sadScore >= 1
      ) ||
      (
        tokens.has("bad") &&
        tokens.has("day")
      ) ||
      (
        tokens.has("triste") &&
        sadScore >= 1
      );

    const looksLikeHappy =
      normalized === "xrp" ||
      normalized === "x r p" ||
      normalized === "ex ar pee" ||
      normalized === "ecs ar pi" ||
      normalized.includes(
        "happy day"
      ) ||
      normalized.includes(
        "good day"
      ) ||
      normalized.includes(
        "i feel good"
      ) ||
      normalized.includes(
        "i feel great"
      ) ||
      (
        tokens.has("happy") &&
        happyScore >= 1
      );

    const looksLikeExcited =
      normalized.includes(
        "i am excited"
      ) ||
      normalized.includes(
        "im excited"
      ) ||
      normalized.includes(
        "lets get excited"
      ) ||
      normalized.includes(
        "this is amazing"
      ) ||
      normalized.includes(
        "this is awesome"
      ) ||
      normalized.includes(
        "wow"
      ) ||
      (
        tokens.has("excited") &&
        excitedScore >= 1
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

    if (
      looksLikeReady ||
      looksLikeExcited
    ) {
      action = "turn_excited";
      repeatCount = repeatedEmotionCount(
        tokenList,
        [
          "excited",
          "wow",
          "emocionado",
        ]
      );
      confidenceLabel =
        `Phrase matched: ready/excited (${Math.max(
          readyScore,
          excitedScore
        )} keyword matches)`;
    } else if (looksLikeSad) {
      action = "turn_sad";
      repeatCount = repeatedEmotionCount(
        tokenList,
        ["sad", "triste"]
      );
      confidenceLabel =
        `Phrase matched: sad/bad day (${sadScore} keyword matches)`;
    } else if (looksLikeInLove) {
      action = "turn_in_love";
      repeatCount = repeatedEmotionCount(
        tokenList,
        ["love", "friend"]
      );
      confidenceLabel =
        `Phrase matched: in-love/friend (${inLoveScore} keyword matches)`;
    } else if (
      looksLikeGreeting ||
      looksLikeHappy
    ) {
      action = "turn_happy";
      repeatCount = repeatedEmotionCount(
        tokenList,
        ["happy", "feliz"]
      );
      confidenceLabel =
        `Phrase matched: greeting/happy (${Math.max(
          greetingScore,
          happyScore
        )} keyword matches)`;
    }
  }

  return {
    transcript:
      normalized,

    action,

    confidenceLabel,

    repeatCount,
  };
}


function isRepeatableEmotionAction(
  action: VoiceCommandAction
): boolean {
  return (
    action === "turn_happy" ||
    action === "turn_sad" ||
    action === "turn_excited" ||
    action === "turn_in_love"
  );
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

        /*
         * Send the command once with repeatCount.
         *
         * EmotionWidget is responsible for repeating
         * dashboard-only sound/animation without sending
         * duplicate commands to the XRP / Red Vision.
         */
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
