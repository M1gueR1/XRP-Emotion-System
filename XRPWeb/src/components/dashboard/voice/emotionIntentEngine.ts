import type {
  VoiceCommandAction,
  VoiceCommandResult,
  VoiceIntentCategory,
} from "./voiceCommandTypes";


type NonUnknownVoiceAction =
  Exclude<
    VoiceCommandAction,
    "unknown"
  >;


type VoiceIntentRule = {
  id: string;
  action: NonUnknownVoiceAction;
  intentLabel: string;
  intentCategory: VoiceIntentCategory;
  confidenceScore: number;
  confidenceLabel: string;
  exact?: string[];
  phrases?: string[];
  repeatWords?: string[];
  repeatedLabel?: string;
};


type ScoredIntentRule = {
  id: string;
  action: NonUnknownVoiceAction;
  intentLabel: string;
  intentCategory: VoiceIntentCategory;
  words: string[];
  repeatWords?: string[];
  minimumScore: number;
  confidenceLabel: (
    score: number
  ) => string;
  matches: (
    normalized: string,
    tokens: Set<string>,
    score: number
  ) => boolean;
};


export function normalizeTranscript(
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
  targetWords?: string[]
): number {
  if (!targetWords) {
    return 1;
  }

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


function clampConfidence(
  confidenceScore: number
): number {
  if (confidenceScore < 0) {
    return 0;
  }

  if (confidenceScore > 1) {
    return 1;
  }

  return confidenceScore;
}


function confidenceFromScore(
  score: number,
  minimumScore: number
): number {
  if (score <= 0) {
    return 0;
  }

  const extraScore =
    Math.max(
      score - minimumScore,
      0
    );

  return clampConfidence(
    0.62 +
      minimumScore * 0.06 +
      extraScore * 0.08
  );
}


function ruleMatches(
  normalized: string,
  rule: VoiceIntentRule
): boolean {
  if (
    rule.exact?.includes(
      normalized
    )
  ) {
    return true;
  }

  return (
    rule.phrases?.some((phrase) =>
      normalized.includes(
        phrase
      )
    ) ?? false
  );
}


function buildResult(
  normalized: string,
  rule: VoiceIntentRule,
  tokenList: string[]
): VoiceCommandResult {
  const repeatCount =
    repeatedEmotionCount(
      tokenList,
      rule.repeatWords
    );

  const confidenceLabel =
    repeatCount > 1 &&
    rule.repeatedLabel
      ? `${rule.repeatedLabel} x${repeatCount}`
      : rule.confidenceLabel;

  return {
    transcript:
      normalized,

    action:
      rule.action,

    confidenceLabel,

    repeatCount,

    source: "intent_engine",

    matchedRuleId:
      rule.id,

    intentLabel:
      rule.intentLabel,

    intentCategory:
      rule.intentCategory,

    confidenceScore:
      clampConfidence(
        rule.confidenceScore
      ),
  };
}


function buildScoredResult(
  normalized: string,
  rule: ScoredIntentRule,
  tokenList: string[],
  score: number
): VoiceCommandResult {
  return {
    transcript:
      normalized,

    action:
      rule.action,

    confidenceLabel:
      rule.confidenceLabel(
        score
      ),

    repeatCount:
      repeatedEmotionCount(
        tokenList,
        rule.repeatWords
      ),

    source: "intent_engine",

    matchedRuleId:
      rule.id,

    intentLabel:
      rule.intentLabel,

    intentCategory:
      rule.intentCategory,

    confidenceScore:
      confidenceFromScore(
        score,
        rule.minimumScore
      ),
  };
}


const DIRECT_INTENT_RULES:
  VoiceIntentRule[] = [
    {
      id: "safety.stop",
      action: "stop",
      intentLabel: "Stop",
      intentCategory: "safety",
      confidenceScore: 0.99,
      confidenceLabel:
        "Direct stop command",
      exact: [
        "stop",
      ],
      phrases: [
        "stop robot",
        "stop moving",
        "emergency stop",
        "freeze",
        "detente",
        "para",
      ],
    },

    {
      id: "macro.lets_play",
      action: "lets_play",
      intentLabel: "Start challenge",
      intentCategory: "macro",
      confidenceScore: 0.96,
      confidenceLabel:
        "Challenge/play command",
      exact: [
        "challenge",
      ],
      phrases: [
        "lets play",
        "let us play",
        "lets do a challenge",
        "lets go to the challenge",
        "go to the challenge",
        "start challenge",
      ],
    },

    {
      id: "macro.showtime",
      action: "showtime",
      intentLabel: "Showtime",
      intentCategory: "macro",
      confidenceScore: 0.94,
      confidenceLabel:
        "Showtime macro command",
      phrases: [
        "showtime",
        "show time",
        "start show",
        "demo mode",
        "do a dance",
        "dance",
      ],
    },

    {
      id: "macro.sleep",
      action: "go_to_sleep",
      intentLabel: "Go to sleep",
      intentCategory: "macro",
      confidenceScore: 0.94,
      confidenceLabel:
        "Sleep macro command",
      exact: [
        "sleep",
      ],
      phrases: [
        "go to sleep",
        "go sleep",
        "sleep mode",
        "good night",
        "buenas noches",
        "duermete",
      ],
    },

    {
      id: "movement.right",
      action: "turn_right",
      intentLabel: "Turn right",
      intentCategory: "movement",
      confidenceScore: 0.95,
      confidenceLabel:
        "Direct movement command",
      exact: [
        "right",
      ],
      phrases: [
        "turn to the right",
        "turn right",
        "gira a la derecha",
        "derecha",
      ],
    },

    {
      id: "movement.left",
      action: "turn_left",
      intentLabel: "Turn left",
      intentCategory: "movement",
      confidenceScore: 0.95,
      confidenceLabel:
        "Direct movement command",
      exact: [
        "left",
      ],
      phrases: [
        "turn to the left",
        "turn left",
        "gira a la izquierda",
        "izquierda",
      ],
    },

    {
      id: "movement.back",
      action: "turn_back",
      intentLabel: "Move back",
      intentCategory: "movement",
      confidenceScore: 0.95,
      confidenceLabel:
        "Direct movement command",
      exact: [
        "back",
      ],
      phrases: [
        "move back",
        "go back",
        "move backward",
        "back up",
        "turn back",
        "reversa",
        "atrás",
        "atras",
      ],
    },

    {
      id: "emotion.sad",
      action: "turn_sad",
      intentLabel: "Sad",
      intentCategory: "emotion",
      confidenceScore: 0.97,
      confidenceLabel:
        "Sad emotion phrase",
      repeatedLabel:
        "Repeated sad command",
      exact: [
        "sad",
      ],
      phrases: [
        "turn sad",
        "be sad",
        "i am sad",
        "im sad",
        "i feel sad",
        "today i had a sad day",
        "today i had a bad day",
        "i had a bad day",
        "bad day",
        "sad day",
        "i feel bad",
        "i am upset",
        "im upset",
        "sad sad",
        "triste",
      ],
      repeatWords: [
        "sad",
        "triste",
      ],
    },

    {
      id: "emotion.in_love",
      action: "turn_in_love",
      intentLabel: "In love",
      intentCategory: "emotion",
      confidenceScore: 0.97,
      confidenceLabel:
        "In-love/friend phrase",
      repeatedLabel:
        "Repeated in-love command",
      phrases: [
        "turn in love",
        "in love",
        "be in love",
        "love love",
        "you are my friend",
        "youre my friend",
        "you are my best friend",
        "youre my best friend",
        "i like you",
        "i love you",
        "my friend",
        "best friend",
        "im really happy",
        "i am really happy",
        "im very happy",
        "i am very happy",
        "i like to work with you",
        "i like working with you",
        "i love working with you",
        "i love to work with you",
        "enamorado",
        "enamorada",
      ],
      repeatWords: [
        "love",
        "friend",
        "enamorado",
        "enamorada",
      ],
    },

    {
      id: "emotion.happy",
      action: "turn_happy",
      intentLabel: "Happy",
      intentCategory: "emotion",
      confidenceScore: 0.97,
      confidenceLabel:
        "Happy emotion phrase",
      repeatedLabel:
        "Repeated happy command",
      exact: [
        "happy",
        "xrp",
        "x r p",
        "ex ar pee",
        "ecs ar pi",
      ],
      phrases: [
        "turn happy",
        "be happy",
        "i feel happy",
        "i feel good",
        "i feel great",
        "today is a good day",
        "today is a happy day",
        "good day",
        "great day",
        "happy happy",
        "feliz",
      ],
      repeatWords: [
        "happy",
        "feliz",
      ],
    },

    {
      id: "emotion.excited",
      action: "turn_excited",
      intentLabel: "Excited",
      intentCategory: "emotion",
      confidenceScore: 0.97,
      confidenceLabel:
        "Excited emotion phrase",
      repeatedLabel:
        "Repeated excited command",
      exact: [
        "excited",
      ],
      phrases: [
        "turn excited",
        "be excited",
        "i am excited",
        "im excited",
        "lets get excited",
        "this is amazing",
        "this is awesome",
        "wow",
        "excited excited",
        "emocionado",
      ],
      repeatWords: [
        "excited",
        "wow",
        "emocionado",
      ],
    },
  ];


const SCORED_INTENT_RULES:
  ScoredIntentRule[] = [
    {
      id: "score.excited_or_ready",
      action: "turn_excited",
      intentLabel: "Excited",
      intentCategory: "emotion",
      minimumScore: 2,
      words: [
        "are",
        "you",
        "ready",
        "for",
        "today",
        "listo",
        "lista",
        "hoy",
        "excited",
        "amazing",
        "awesome",
        "wow",
        "challenge",
      ],
      repeatWords: [
        "excited",
        "wow",
        "emocionado",
      ],
      confidenceLabel: (score) =>
        `Phrase matched: ready/excited (${score} keyword matches)`,
      matches: (
        normalized,
        tokens,
        score
      ) =>
        normalized.includes(
          "are you ready"
        ) ||
        normalized.includes(
          "ready for today"
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
        (
          tokens.has("ready") &&
          score >= 2
        ) ||
        (
          tokens.has("excited") &&
          score >= 1
        ) ||
        score >= 3,
    },

    {
      id: "score.sad_or_bad_day",
      action: "turn_sad",
      intentLabel: "Sad",
      intentCategory: "emotion",
      minimumScore: 1,
      words: [
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
      ],
      repeatWords: [
        "sad",
        "triste",
      ],
      confidenceLabel: (score) =>
        `Phrase matched: sad/bad day (${score} keyword matches)`,
      matches: (
        normalized,
        tokens,
        score
      ) =>
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
          score >= 1
        ) ||
        (
          tokens.has("bad") &&
          tokens.has("day")
        ) ||
        (
          tokens.has("triste") &&
          score >= 1
        ),
    },

    {
      id: "score.in_love_or_friend",
      action: "turn_in_love",
      intentLabel: "In love",
      intentCategory: "emotion",
      minimumScore: 2,
      words: [
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
      ],
      repeatWords: [
        "love",
        "friend",
      ],
      confidenceLabel: (score) =>
        `Phrase matched: in-love/friend (${score} keyword matches)`,
      matches: (
        normalized,
        tokens,
        score
      ) =>
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
          score >= 3
        ) ||
        (
          tokens.has("love") &&
          score >= 2
        ) ||
        (
          tokens.has("happy") &&
          score >= 3
        ) ||
        (
          tokens.has("feliz") &&
          score >= 3
        ),
    },

    {
      id: "score.greeting_or_happy",
      action: "turn_happy",
      intentLabel: "Happy",
      intentCategory: "emotion",
      minimumScore: 1,
      words: [
        "xrp",
        "happy",
        "good",
        "great",
        "day",
        "feel",
        "hello",
        "hi",
        "hey",
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
        "feliz",
      ],
      repeatWords: [
        "happy",
        "feliz",
      ],
      confidenceLabel: (score) =>
        `Phrase matched: greeting/happy (${score} keyword matches)`,
      matches: (
        normalized,
        tokens,
        score
      ) =>
        normalized === "xrp" ||
        normalized === "x r p" ||
        normalized === "ex ar pee" ||
        normalized === "ecs ar pi" ||
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
        tokens.has("hello") ||
        tokens.has("hi") ||
        tokens.has("hey") ||
        (
          hasAnyToken(
            tokens,
            ["xrp", "you"]
          ) &&
          score >= 3
        ) ||
        (
          tokens.has("happy") &&
          score >= 1
        ) ||
        score >= 4,
    },
  ];


const HYBRID_EMOTION_THRESHOLD = 0.58;


type HybridEmotionProfile = {
  id: string;
  action: Extract<
    VoiceCommandAction,
    | "turn_happy"
    | "turn_sad"
    | "turn_excited"
    | "turn_in_love"
  >;
  intentLabel: string;
  repeatWords: string[];
  positivePhrases: string[];
  negativePhrases?: string[];
  keywordWeights: Record<
    string,
    number
  >;
};


type HybridEmotionScore = {
  profile: HybridEmotionProfile;
  score: number;
  matchedSignals: string[];
};


const HYBRID_EMOTION_PROFILES:
  HybridEmotionProfile[] = [
    {
      id: "hybrid.happy",
      action: "turn_happy",
      intentLabel: "Happy",
      repeatWords: [
        "happy",
        "feliz",
      ],
      positivePhrases: [
        "good day",
        "great day",
        "feel good",
        "feel great",
        "doing well",
        "i am okay",
        "im okay",
        "that was fun",
        "this is fun",
        "nice job",
        "well done",
        "thank you",
        "thanks",
      ],
      negativePhrases: [
        "bad day",
        "sad day",
        "not happy",
      ],
      keywordWeights: {
        happy: 1.8,
        good: 1.2,
        great: 1.4,
        fun: 1.3,
        nice: 1.0,
        smile: 1.2,
        okay: 0.8,
        fine: 0.7,
        thanks: 1.0,
        thank: 0.9,
        proud: 1.2,
        feliz: 1.8,
        bien: 0.9,
      },
    },

    {
      id: "hybrid.sad",
      action: "turn_sad",
      intentLabel: "Sad",
      repeatWords: [
        "sad",
        "triste",
      ],
      positivePhrases: [
        "bad day",
        "sad day",
        "feel bad",
        "feel sad",
        "not good",
        "not okay",
        "i am tired",
        "im tired",
        "i am lonely",
        "im lonely",
        "i feel lonely",
        "i am upset",
        "im upset",
        "i am worried",
        "im worried",
        "i am stressed",
        "im stressed",
        "that hurt",
        "that was hard",
        "that was difficult",
      ],
      negativePhrases: [
        "good day",
        "great day",
        "feel great",
      ],
      keywordWeights: {
        sad: 1.9,
        bad: 1.5,
        upset: 1.5,
        lonely: 1.5,
        tired: 1.0,
        hard: 1.1,
        difficult: 1.1,
        hurt: 1.3,
        worried: 1.4,
        stress: 1.2,
        stressed: 1.3,
        cry: 1.5,
        crying: 1.5,
        triste: 1.9,
        mal: 1.4,
      },
    },

    {
      id: "hybrid.excited",
      action: "turn_excited",
      intentLabel: "Excited",
      repeatWords: [
        "excited",
        "wow",
        "emocionado",
      ],
      positivePhrases: [
        "are you ready",
        "ready for today",
        "lets go",
        "let us go",
        "this is amazing",
        "this is awesome",
        "i am excited",
        "im excited",
        "so cool",
        "very cool",
        "that is cool",
        "lets do this",
        "lets start",
        "big challenge",
        "new challenge",
      ],
      negativePhrases: [
        "go to sleep",
        "bad day",
        "sad day",
      ],
      keywordWeights: {
        excited: 2.0,
        ready: 1.5,
        amazing: 1.6,
        awesome: 1.6,
        wow: 1.8,
        cool: 1.2,
        challenge: 1.3,
        start: 0.9,
        fast: 0.8,
        race: 1.1,
        play: 0.8,
        emocionado: 2.0,
        increible: 1.4,
      },
    },

    {
      id: "hybrid.in_love",
      action: "turn_in_love",
      intentLabel: "In love",
      repeatWords: [
        "love",
        "friend",
        "enamorado",
        "enamorada",
      ],
      positivePhrases: [
        "you are my friend",
        "youre my friend",
        "you are my best friend",
        "youre my best friend",
        "i like you",
        "i love you",
        "my friend",
        "best friend",
        "i like working with you",
        "i like to work with you",
        "i love working with you",
        "i love to work with you",
        "you are cute",
        "youre cute",
        "you are awesome",
        "youre awesome",
        "i trust you",
        "you help me",
      ],
      negativePhrases: [
        "i hate you",
        "bad robot",
      ],
      keywordWeights: {
        love: 2.0,
        like: 1.3,
        friend: 1.8,
        best: 0.8,
        cute: 1.2,
        awesome: 1.0,
        trust: 1.1,
        help: 0.8,
        together: 0.8,
        care: 1.0,
        hug: 1.3,
        enamorado: 2.0,
        enamorada: 2.0,
        amigo: 1.6,
        amiga: 1.6,
      },
    },
  ];


function countPhraseMatches(
  normalized: string,
  phrases: string[]
): {
  count: number;
  matches: string[];
} {
  const matches =
    phrases.filter((phrase) =>
      normalized.includes(
        phrase
      )
    );

  return {
    count:
      matches.length,

    matches,
  };
}


function scoreHybridProfile(
  normalized: string,
  tokens: Set<string>,
  profile: HybridEmotionProfile
): HybridEmotionScore {
  let score = 0;

  const matchedSignals: string[] = [];

  const positivePhraseMatches =
    countPhraseMatches(
      normalized,
      profile.positivePhrases
    );

  if (
    positivePhraseMatches.count > 0
  ) {
    score +=
      positivePhraseMatches.count * 2.2;

    matchedSignals.push(
      ...positivePhraseMatches.matches.map(
        (phrase) => `phrase:${phrase}`
      )
    );
  }

  const negativePhraseMatches =
    countPhraseMatches(
      normalized,
      profile.negativePhrases ?? []
    );

  if (
    negativePhraseMatches.count > 0
  ) {
    score -=
      negativePhraseMatches.count * 2.5;
  }

  for (const [
    keyword,
    weight,
  ] of Object.entries(
    profile.keywordWeights
  )) {
    if (tokens.has(keyword)) {
      score += weight;

      matchedSignals.push(
        `word:${keyword}`
      );
    }
  }

  return {
    profile,
    score,
    matchedSignals,
  };
}


function confidenceFromHybridScore(
  score: number,
  runnerUpScore: number
): number {
  const margin =
    Math.max(
      score - runnerUpScore,
      0
    );

  return clampConfidence(
    0.48 +
      score * 0.08 +
      margin * 0.06
  );
}


function inferHybridEmotionIntent(
  normalized: string,
  tokenList: string[],
  tokens: Set<string>
): VoiceCommandResult | null {
  const scoredProfiles =
    HYBRID_EMOTION_PROFILES
      .map((profile) =>
        scoreHybridProfile(
          normalized,
          tokens,
          profile
        )
      )
      .sort(
        (left, right) =>
          right.score - left.score
      );

  const best =
    scoredProfiles[0];

  const runnerUp =
    scoredProfiles[1];

  if (
    !best ||
    best.score <= 0 ||
    best.matchedSignals.length === 0
  ) {
    return null;
  }

  const runnerUpScore =
    runnerUp?.score ?? 0;

  const confidenceScore =
    confidenceFromHybridScore(
      best.score,
      runnerUpScore
    );

  if (
    confidenceScore <
    HYBRID_EMOTION_THRESHOLD
  ) {
    return null;
  }

  const topSignals =
    best.matchedSignals
      .slice(0, 3)
      .join(", ");

  return {
    transcript:
      normalized,

    action:
      best.profile.action,

    confidenceLabel:
      `Hybrid emotion score ${best.score.toFixed(
        1
      )} using ${topSignals}`,

    repeatCount:
      repeatedEmotionCount(
        tokenList,
        best.profile.repeatWords
      ),

    source: "intent_engine",

    matchedRuleId:
      best.profile.id,

    intentLabel:
      best.profile.intentLabel,

    intentCategory:
      "emotion",

    confidenceScore,
  };
}


export function isRepeatableEmotionAction(
  action: VoiceCommandAction
): boolean {
  return (
    action === "turn_happy" ||
    action === "turn_sad" ||
    action === "turn_excited" ||
    action === "turn_in_love" ||
    action === "turn_idle" ||
    action === "turn_upset"
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

  for (const rule of DIRECT_INTENT_RULES) {
    if (
      ruleMatches(
        normalized,
        rule
      )
    ) {
      return buildResult(
        normalized,
        rule,
        tokenList
      );
    }
  }

  for (const rule of SCORED_INTENT_RULES) {
    const score =
      scoreTokens(
        tokens,
        rule.words
      );

    if (
      rule.matches(
        normalized,
        tokens,
        score
      )
    ) {
      return buildScoredResult(
        normalized,
        rule,
        tokenList,
        score
      );
    }
  }

  const hybridResult =
    inferHybridEmotionIntent(
      normalized,
      tokenList,
      tokens
    );

  if (hybridResult) {
    return hybridResult;
  }

  return {
    transcript:
      normalized,

    action: "unknown",

    confidenceLabel:
      "No matching command",

    repeatCount: 1,

    source: "intent_engine",

    matchedRuleId: null,

    intentLabel:
      "Unknown",

    intentCategory:
      "unknown",

    confidenceScore: 0,
  };
}
