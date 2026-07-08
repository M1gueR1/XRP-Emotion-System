import {
  factFromMemoryItem,
  normalizeMemoryText,
  type UserMemoryItem,
  type UserProfile,
} from "../profiles/userProfileStore";


export type LocalSocialEmotionLabel =
  | "Idle"
  | "Happy"
  | "Sad"
  | "Excited"
  | "In love"
  | "Upset";


export type LocalSocialDecision = {
  emotionId: number;
  emotionLabel: LocalSocialEmotionLabel;
  confidence: number;
  reason: string;
};


export type LocalSocialReasoningResult = {
  decision: LocalSocialDecision;
  reply?: string;
  confidence: number;
  matchedMemoryItems: UserMemoryItem[];
  reason: string;
};


export type LocalSocialReasoningInput = {
  text: string;
  profile: UserProfile | null;
  parsedMemoryItems?: UserMemoryItem[];
};


const EMOTION_IDLE_ID = 0;
const EMOTION_HAPPY_ID = 1;
const EMOTION_EXCITED_ID = 3;
const EMOTION_UPSET_ID = 8;
const EMOTION_SAD_ID = 9;
const EMOTION_IN_LOVE_ID = 12;


type EventTone =
  | "positive"
  | "negative"
  | "cancelled_negative"
  | "neutral";


type RelationCue = {
  id: string;
  positiveTerms: string[];
  negativeTerms: string[];
  positiveLabel: string;
  negativeLabel: string;
};


const RELATION_CUES:
  RelationCue[] = [
    {
      id: "weather.sunny_rain",
      positiveTerms: [
        "sunny",
        "sun",
        "sunshine",
        "good weather",
        "clear sky",
        "bright day",
      ],
      negativeTerms: [
        "rain",
        "raining",
        "rainy",
        "storm",
        "stormy",
        "cloudy",
        "dark weather",
      ],
      positiveLabel:
        "sunny weather",
      negativeLabel:
        "rainy weather",
    },
    {
      id: "sports.win_loss",
      positiveTerms: [
        "won",
        "win",
        "winning",
        "champion",
        "victory",
        "qualified",
        "scored",
        "gano",
        "ganamos",
        "victoria",
        "campeon",
        "clasifico",
      ],
      negativeTerms: [
        "lost",
        "lose",
        "losing",
        "defeated",
        "eliminated",
        "missed",
        "perdio",
        "perdimos",
        "perder",
        "eliminado",
      ],
      positiveLabel:
        "winning",
      negativeLabel:
        "losing",
    },
    {
      id: "school.pass_fail",
      positiveTerms: [
        "passed",
        "pass",
        "good grade",
        "high grade",
        "approved",
        "aprobe",
        "pase",
        "buena nota",
        "me fue bien",
      ],
      negativeTerms: [
        "failed",
        "fail",
        "bad grade",
        "low grade",
        "reprobe",
        "perdi",
        "perdi el examen",
        "mala nota",
        "me fue mal",
      ],
      positiveLabel:
        "passing",
      negativeLabel:
        "failing",
    },
    {
      id: "technology.working_broken",
      positiveTerms: [
        "works",
        "working",
        "fixed",
        "compiled",
        "build passed",
        "funciona",
        "sirve",
        "arregle",
        "compilo",
      ],
      negativeTerms: [
        "broken",
        "not working",
        "does not work",
        "doesnt work",
        "error",
        "bug",
        "crashed",
        "no funciona",
        "fallo",
      ],
      positiveLabel:
        "working",
      negativeLabel:
        "not working",
    },
  ];


const POSITIVE_EVENT_TERMS = [
  "won",
  "win",
  "winning",
  "gano",
  "ganamos",
  "victory",
  "passed",
  "pass",
  "aprobe",
  "pase",
  "works",
  "working",
  "fixed",
  "funciona",
  "good",
  "great",
  "awesome",
  "amazing",
  "sunny",
  "fun",
  "happy",
  "success",
];


const NEGATIVE_EVENT_TERMS = [
  "lost",
  "lose",
  "losing",
  "perdio",
  "perdimos",
  "failed",
  "fail",
  "bad",
  "sad",
  "broken",
  "not working",
  "no funciona",
  "error",
  "bug",
  "rain",
  "raining",
  "rainy",
  "storm",
  "cloudy",
  "gone",
  "hurt",
  "angry",
  "didnt eat",
  "did not eat",
  "couldnt eat",
  "could not eat",
  "without",
  "missed",
  "ran out",
  "empty",
  "no food",
  "cant play",
  "cannot play",
  "could not play",
  "did not play",
];


const CANCELLED_TERMS = [
  "cancelled",
  "canceled",
  "removed",
  "no more",
  "not anymore",
  "is over",
  "was cancelled",
  "was canceled",
  "se cancelo",
  "se canceló",
  "cancelaron",
  "ya no hay",
];


const AFFECTION_TERMS = [
  "i love you",
  "you are my friend",
  "youre my friend",
  "you are my best friend",
  "i like you",
  "te quiero",
  "te amo",
  "eres mi amigo",
];


function normalize(
  value: string
): string {
  return normalizeMemoryText(value);
}


function hasAny(
  normalized: string,
  terms: string[]
): boolean {
  return terms.some((term) =>
    normalized.includes(
      normalize(term)
    )
  );
}


function countMatches(
  normalized: string,
  terms: string[]
): number {
  return terms.filter((term) =>
    normalized.includes(
      normalize(term)
    )
  ).length;
}


function eventTone(
  text: string
): EventTone {
  const normalized =
    normalize(text);

  if (
    hasAny(normalized, CANCELLED_TERMS)
  ) {
    return "cancelled_negative";
  }

  const positiveCount =
    countMatches(
      normalized,
      POSITIVE_EVENT_TERMS
    );

  const negativeCount =
    countMatches(
      normalized,
      NEGATIVE_EVENT_TERMS
    );

  if (
    positiveCount > negativeCount
  ) {
    return "positive";
  }

  if (
    negativeCount > positiveCount
  ) {
    return "negative";
  }

  return "neutral";
}


function targetText(
  memory: UserMemoryItem
): string {
  return [
    memory.target,
    memory.value,
    memory.field,
  ]
    .filter(Boolean)
    .join(" ");
}


function memoryKeywords(
  memory: UserMemoryItem
): string[] {
  return normalize(
    targetText(memory)
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 4 &&
        ![
          "likes",
          "love",
          "loves",
          "prefer",
          "prefers",
          "does",
          "not",
          "from",
          "makes",
          "happy",
          "sad",
          "upset",
          "excited",
          "studies",
          "works",
          "weather",
          "when",
          "than",
          "rather",
        ].includes(word)
    );
}


function directMemoryMatches(
  text: string,
  profile: UserProfile | null
): UserMemoryItem[] {
  if (!profile) {
    return [];
  }

  const normalized =
    normalize(text);

  return profile.memoryItems
    .filter((memory) =>
      memoryKeywords(memory).some(
        (keyword) =>
          normalized.includes(
            keyword
          )
      )
    )
    .slice(0, 5);
}


function relationMatches(
  text: string,
  profile: UserProfile | null
): UserMemoryItem[] {
  if (!profile) {
    return [];
  }

  const normalized =
    normalize(text);

  const matches:
    UserMemoryItem[] = [];

  for (const memory of profile.memoryItems) {
    const memoryText =
      normalize(
        targetText(memory)
      );

    for (const relation of RELATION_CUES) {
      const memoryLikesPositive =
        relation.positiveTerms.some(
          (term) =>
            memoryText.includes(
              normalize(term)
            )
        );

      const memoryLikesNegative =
        relation.negativeTerms.some(
          (term) =>
            memoryText.includes(
              normalize(term)
            )
        );

      const messagePositive =
        relation.positiveTerms.some(
          (term) =>
            normalized.includes(
              normalize(term)
            )
        );

      const messageNegative =
        relation.negativeTerms.some(
          (term) =>
            normalized.includes(
              normalize(term)
            )
        );

      if (
        memoryLikesPositive &&
        messageNegative
      ) {
        matches.push(memory);
      } else if (
        memoryLikesNegative &&
        messagePositive
      ) {
        matches.push(memory);
      }
    }
  }

  return matches.slice(0, 5);
}


function formatMemory(
  memory: UserMemoryItem,
  profile: UserProfile
): string {
  if (
    memory.kind === "preference" &&
    memory.target &&
    memory.polarity
  ) {
    if (
      memory.polarity === "hate" ||
      memory.polarity === "dislike"
    ) {
      return `you do not like ${memory.target}`;
    }

    if (memory.polarity === "prefer") {
      return `you prefer ${memory.target}`;
    }

    if (memory.polarity === "love") {
      return `you love ${memory.target}`;
    }

    return `you like ${memory.target}`;
  }

  if (
    memory.kind === "identity" &&
    memory.field === "origin" &&
    memory.value
  ) {
    return `you are from ${memory.value}`;
  }

  if (
    memory.kind === "study" &&
    memory.value
  ) {
    return `you study ${memory.value}`;
  }

  if (
    memory.kind === "work" &&
    memory.value
  ) {
    return `you work on ${memory.value}`;
  }

  if (
    memory.kind === "emotional_trigger" &&
    memory.target &&
    memory.emotion
  ) {
    return `${memory.target} makes you ${memory.emotion.replace("_", " ")}`;
  }

  return factFromMemoryItem(
    memory,
    profile.displayName
  );
}


function decision(
  emotionLabel: LocalSocialEmotionLabel,
  confidence: number,
  reason: string
): LocalSocialDecision {
  switch (emotionLabel) {
    case "Happy":
      return {
        emotionId:
          EMOTION_HAPPY_ID,
        emotionLabel,
        confidence,
        reason,
      };

    case "Sad":
      return {
        emotionId:
          EMOTION_SAD_ID,
        emotionLabel,
        confidence,
        reason,
      };

    case "Excited":
      return {
        emotionId:
          EMOTION_EXCITED_ID,
        emotionLabel,
        confidence,
        reason,
      };

    case "In love":
      return {
        emotionId:
          EMOTION_IN_LOVE_ID,
        emotionLabel,
        confidence,
        reason,
      };

    case "Upset":
      return {
        emotionId:
          EMOTION_UPSET_ID,
        emotionLabel,
        confidence,
        reason,
      };

    default:
      return {
        emotionId:
          EMOTION_IDLE_ID,
        emotionLabel: "Idle",
        confidence,
        reason,
      };
  }
}


function defaultResult(
  text: string
): LocalSocialReasoningResult {
  const normalized =
    normalize(text);

  if (
    hasAny(normalized, AFFECTION_TERMS)
  ) {
    const result =
      decision(
        "In love",
        0.78,
        "The local social engine detected affection toward the robot."
      );

    return {
      decision: result,
      confidence:
        result.confidence,
      matchedMemoryItems: [],
      reason:
        result.reason,
    };
  }

  const tone =
    eventTone(text);

  if (tone === "positive") {
    const result =
      decision(
        "Happy",
        0.62,
        "The local social engine detected a positive event."
      );

    return {
      decision: result,
      confidence:
        result.confidence,
      matchedMemoryItems: [],
      reason:
        result.reason,
    };
  }

  if (tone === "negative") {
    const result =
      decision(
        "Sad",
        0.64,
        "The local social engine detected a negative event."
      );

    return {
      decision: result,
      confidence:
        result.confidence,
      matchedMemoryItems: [],
      reason:
        result.reason,
    };
  }

  const idle =
    decision(
      "Idle",
      0.45,
      "The local social engine did not find a strong personal or emotional signal."
    );

  return {
    decision:
      idle,
    confidence:
      idle.confidence,
    matchedMemoryItems: [],
    reason:
      idle.reason,
  };
}


function preferenceEmotionFromTone(
  memory: UserMemoryItem,
  tone: EventTone
): LocalSocialEmotionLabel {
  const polarity =
    memory.polarity;

  const positivePreference =
    polarity === "like" ||
    polarity === "love" ||
    polarity === "prefer";

  const negativePreference =
    polarity === "dislike" ||
    polarity === "hate";

  if (
    positivePreference &&
    tone === "positive"
  ) {
    return "Excited";
  }

  if (
    positivePreference &&
    tone === "negative"
  ) {
    return "Sad";
  }

  if (
    negativePreference &&
    tone === "positive"
  ) {
    return "Upset";
  }

  if (
    negativePreference &&
    (
      tone === "negative" ||
      tone === "cancelled_negative"
    )
  ) {
    return "Happy";
  }

  return "Idle";
}


function triggerEmotionFromTone(
  memory: UserMemoryItem,
  tone: EventTone
): LocalSocialEmotionLabel {
  if (
    memory.kind !== "emotional_trigger" ||
    !memory.emotion
  ) {
    return "Idle";
  }

  /*
   * Important:
   * If the saved trigger is "Colombia losing makes me sad"
   * and the user says "Colombia won", the current event is
   * positive, so it should not activate Sad.
   */
  if (
    tone === "positive" &&
    (
      memory.emotion === "sad" ||
      memory.emotion === "upset"
    )
  ) {
    return "Excited";
  }

  if (
    tone === "negative" &&
    (
      memory.emotion === "happy" ||
      memory.emotion === "excited"
    )
  ) {
    return "Sad";
  }

  switch (memory.emotion) {
    case "happy":
      return "Happy";

    case "sad":
      return "Sad";

    case "excited":
      return "Excited";

    case "upset":
      return "Upset";

    case "in_love":
      return "In love";
  }
}


function replyForMemoryReasoning(
  text: string,
  profile: UserProfile,
  memory: UserMemoryItem,
  emotion: LocalSocialEmotionLabel,
  tone: EventTone
): string {
  const memoryText =
    formatMemory(memory, profile);

  if (text.includes("I love you")) {}
  if (
    emotion === "Sad"
  ) {
    return `Oh no, ${profile.displayName}. I remember ${memoryText}, so this probably feels disappointing for you.`;
  }

  if (
    emotion === "Excited"
  ) {
    return `That sounds exciting, ${profile.displayName}. I remember ${memoryText}, so this seems positive for you.`;
  }

  if (
    emotion === "Happy"
  ) {
    if (tone === "cancelled_negative") {
      return `That may actually be good news, ${profile.displayName}. I remember ${memoryText}, so having that cancelled sounds like a relief.`;
    }

    return `Nice, ${profile.displayName}. I remember ${memoryText}, so this sounds good for you.`;
  }

  if (
    emotion === "Upset"
  ) {
    return `I get it, ${profile.displayName}. I remember ${memoryText}, so this could feel frustrating for you.`;
  }

  return `I remember ${memoryText}, ${profile.displayName}.`;
}


function strongestMatchedMemory(
  memories: UserMemoryItem[]
): UserMemoryItem | null {
  return [...memories].sort(
    (left, right) =>
      right.intensity -
      left.intensity
  )[0] ?? null;
}


export function inferLocalSocialReasoning(
  input: LocalSocialReasoningInput
): LocalSocialReasoningResult {
  const profile =
    input.profile;

  const tone =
    eventTone(input.text);

  const directMatches =
    directMemoryMatches(
      input.text,
      profile
    );

  const relationalMatches =
    relationMatches(
      input.text,
      profile
    );

  const matches = [
    ...directMatches,
    ...relationalMatches,
  ];

  if (
    profile &&
    matches.length > 0
  ) {
    const memory =
      strongestMatchedMemory(
        matches
      );

    if (memory) {
      let emotion:
        LocalSocialEmotionLabel =
        "Idle";

      if (
        memory.kind === "preference"
      ) {
        emotion =
          preferenceEmotionFromTone(
            memory,
            tone
          );
      } else if (
        memory.kind === "emotional_trigger"
      ) {
        emotion =
          triggerEmotionFromTone(
            memory,
            tone
          );
      } else if (
        tone === "positive"
      ) {
        emotion =
          "Excited";
      } else if (
        tone === "negative"
      ) {
        emotion =
          "Sad";
      }

      if (
        emotion !== "Idle"
      ) {
        const confidence =
          Math.min(
            0.94,
            Math.max(
              0.76,
              memory.intensity + 0.08
            )
          );

        const result =
          decision(
            emotion,
            confidence,
            `The local social engine matched the current message to saved memory: ${formatMemory(
              memory,
              profile
            )}.`
          );

        return {
          decision:
            result,
          reply:
            replyForMemoryReasoning(
              input.text,
              profile,
              memory,
              emotion,
              tone
            ),
          confidence:
            result.confidence,
          matchedMemoryItems:
            matches,
          reason:
            result.reason,
        };
      }
    }
  }

  /*
   * If the user just shared a strong new preference,
   * the local engine can respond with more nuance.
   */
  const newPreference =
    input.parsedMemoryItems?.find(
      (item) =>
        item.kind === "preference" &&
        item.target
    );

  if (newPreference?.target) {
    const positive =
      newPreference.polarity === "like" ||
      newPreference.polarity === "love" ||
      newPreference.polarity === "prefer";

    const emotion:
      LocalSocialEmotionLabel =
      positive
        ? newPreference.intensity >= 0.8
          ? "Excited"
          : "Happy"
        : "Upset";

    const result =
      decision(
        emotion,
        Math.min(
          0.88,
          Math.max(
            0.68,
            newPreference.intensity
          )
        ),
        `The local social engine detected a new ${newPreference.polarity} preference about ${newPreference.target}.`
      );

    return {
      decision:
        result,
      confidence:
        result.confidence,
      matchedMemoryItems: [
        newPreference,
      ],
      reason:
        result.reason,
    };
  }

  return defaultResult(
    input.text
  );
}


export function shouldPreferLocalSocialReasoning(
  result: LocalSocialReasoningResult
): boolean {
  return result.confidence >= 0.76;
}
