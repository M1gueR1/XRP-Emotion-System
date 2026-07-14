import { EXPANDED_TRAINING_EXAMPLES } from "./localEmotionTrainingData";


export type LocalMlEmotionKey =
  | "idle"
  | "happy"
  | "sad"
  | "excited"
  | "upset"
  | "in_love";


export type LocalMlEmotionResult = {
  emotionKey: LocalMlEmotionKey;
  emotionLabel: string;
  emotionId: number;
  confidence: number;
  reason: string;
  topScores: Array<{
    emotionKey: LocalMlEmotionKey;
    score: number;
  }>;
};


type TrainingExample = {
  text: string;
  label: LocalMlEmotionKey;
};


const EMOTION_ID_BY_KEY:
  Record<LocalMlEmotionKey, number> = {
    idle: 0,
    happy: 1,
    excited: 3,
    upset: 8,
    sad: 9,
    in_love: 12,
  };


const EMOTION_LABEL_BY_KEY:
  Record<LocalMlEmotionKey, string> = {
    idle: "Idle",
    happy: "Happy",
    excited: "Excited",
    upset: "Upset",
    sad: "Sad",
    in_love: "In love",
  };


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "am",
    "was",
    "were",
    "be",
    "been",
    "being",
    "i",
    "im",
    "i'm",
    "me",
    "my",
    "you",
    "your",
    "it",
    "its",
    "to",
    "of",
    "for",
    "with",
    "and",
    "or",
    "but",
    "that",
    "this",
    "so",
    "had",
    "have",
    "has",
    "do",
    "did",
    "does",
    "in",
    "on",
    "at",
    "from",
  ]);


const TRAINING_EXAMPLES:
  TrainingExample[] =
    EXPANDED_TRAINING_EXAMPLES;


type ClassStats = {
  label: LocalMlEmotionKey;
  docCount: number;
  tokenCounts: Map<string, number>;
  totalTokens: number;
};


type ModelStats = {
  classStats:
    Record<LocalMlEmotionKey, ClassStats>;
  vocabulary: Set<string>;
  totalDocs: number;
};


function normalizeText(
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


function tokenize(
  text: string
): string[] {
  const normalized =
    normalizeText(text);

  const words =
    normalized
      .split(" ")
      .filter(
        (word) =>
          word.length > 1 &&
          !STOP_WORDS.has(word)
      );

  const bigrams:
    string[] = [];

  for (
    let index = 0;
    index < words.length - 1;
    index += 1
  ) {
    bigrams.push(
      `${words[index]}_${words[index + 1]}`
    );
  }

  return [
    ...words,
    ...bigrams,
  ];
}


function createEmptyStats(
  label: LocalMlEmotionKey
): ClassStats {
  return {
    label,
    docCount: 0,
    tokenCounts:
      new Map<string, number>(),
    totalTokens: 0,
  };
}


function trainModel():
  ModelStats {
  const labels:
    LocalMlEmotionKey[] = [
      "idle",
      "happy",
      "sad",
      "excited",
      "upset",
      "in_love",
    ];

  const classStats =
    Object.fromEntries(
      labels.map((label) => [
        label,
        createEmptyStats(label),
      ])
    ) as Record<
      LocalMlEmotionKey,
      ClassStats
    >;

  const vocabulary =
    new Set<string>();

  for (const example of TRAINING_EXAMPLES) {
    const stats =
      classStats[example.label];

    stats.docCount += 1;

    for (
      const token of tokenize(
        example.text
      )
    ) {
      vocabulary.add(token);

      stats.tokenCounts.set(
        token,
        (
          stats.tokenCounts.get(token) ??
          0
        ) + 1
      );

      stats.totalTokens += 1;
    }
  }

  return {
    classStats,
    vocabulary,
    totalDocs:
      TRAINING_EXAMPLES.length,
  };
}


const MODEL =
  trainModel();


function logSumExp(
  values: number[]
): number {
  const max =
    Math.max(...values);

  const sum =
    values.reduce(
      (total, value) =>
        total +
        Math.exp(value - max),
      0
    );

  return max + Math.log(sum);
}


/*
 * This is intentionally small now.
 * With the larger dataset, phraseBoost should act as a tie-breaker,
 * not as the main classifier.
 */
const PHRASE_BOOST = 0.3;


function phraseBoost(
  normalized: string,
  label: LocalMlEmotionKey
): number {
  const patterns:
    Record<
      LocalMlEmotionKey,
      RegExp[]
    > = {
      sad: [
        /\bbad exam\b/,
        /\bfailed\b/,
        /\bbad grade\b/,
        /\bdisappointed\b/,
        /\blost\b/,
        /\blonely\b/,
        /\bmiss my\b/,
      ],
      upset: [
        /\bhate\b/,
        /\bannoying\b/,
        /\bangry\b/,
        /\bmad\b/,
        /\bfrustrated\b/,
        /\bbug\b/,
        /\bnothing works\b/,
      ],
      happy: [
        /\bpassed\b/,
        /\bgood grade\b/,
        /\bsunny\b/,
        /\bthank/,
        /\bthanks\b/,
        /\bfeel better\b/,
      ],
      excited: [
        /\breally love\b/,
        /\bamazing\b/,
        /\bawesome\b/,
        /\bwon\b/,
        /\bwe won\b/,
        /\bworked\b/,
        /\baccepted\b/,
        /\blets go\b/,
      ],
      in_love: [
        /\bi love you\b/,
        /\bmy friend\b/,
        /\bbest friend\b/,
        /\bworking with you\b/,
        /\bte quiero\b/,
        /\bte amo\b/,
      ],
      idle: [
        /\bwho am i\b/,
        /\bwhat do you know\b/,
        /\bmy name is\b/,
        /\bi am from\b/,
      ],
    };

  return patterns[label].some((pattern) =>
    pattern.test(normalized)
  )
    ? PHRASE_BOOST
    : 0;
}


export function classifyLocalEmotion(
  text: string
): LocalMlEmotionResult {
  const tokens =
    tokenize(text);

  const normalized =
    normalizeText(text);

  const labels =
    Object.keys(
      MODEL.classStats
    ) as LocalMlEmotionKey[];

  const vocabSize =
    MODEL.vocabulary.size;

  const logScores =
    labels.map((label) => {
      const stats =
        MODEL.classStats[label];

      let score =
        Math.log(
          (stats.docCount + 1) /
            (
              MODEL.totalDocs +
              labels.length
            )
        );

      for (const token of tokens) {
        const tokenCount =
          stats.tokenCounts.get(token) ??
          0;

        score += Math.log(
          (tokenCount + 1) /
            (
              stats.totalTokens +
              vocabSize
            )
        );
      }

      score +=
        phraseBoost(
          normalized,
          label
        );

      return {
        label,
        score,
      };
    });

  const normalizer =
    logSumExp(
      logScores.map(
        (item) => item.score
      )
    );

  const probabilities =
    logScores
      .map((item) => ({
        emotionKey:
          item.label,
        score:
          Math.exp(
            item.score -
              normalizer
          ),
      }))
      .sort(
        (left, right) =>
          right.score -
          left.score
      );

  const top =
    probabilities[0];

  const second =
    probabilities[1];

  const margin =
    top && second
      ? top.score - second.score
      : top?.score ?? 0;

  const confidence =
    Math.min(
      0.94,
      Math.max(
        0.35,
        (top?.score ?? 0.35) +
          Math.max(0, margin) * 0.35
      )
    );

  const emotionKey =
    top?.emotionKey ?? "idle";

  return {
    emotionKey,
    emotionLabel:
      EMOTION_LABEL_BY_KEY[
        emotionKey
      ],
    emotionId:
      EMOTION_ID_BY_KEY[
        emotionKey
      ],
    confidence,
    reason:
      `Local Naive Bayes classifier predicted ${emotionKey} from ${tokens.length} text features using ${TRAINING_EXAMPLES.length} training examples.`,
    topScores:
      probabilities.slice(0, 3),
  };
}


export function shouldPreferLocalMlEmotion(
  result: LocalMlEmotionResult
): boolean {
  return (
    result.confidence >= 0.62 &&
    result.emotionKey !== "idle"
  );
}


export function localMlEmpathyReply(
  result: LocalMlEmotionResult,
  displayName?: string
): string {
  const name =
    displayName
      ? `, ${displayName}`
      : "";

  switch (result.emotionKey) {
    case "sad":
      return `Oh no${name}. I'm sorry that happened. That sounds disappointing, but I'm here with you.`;

    case "upset":
      return `I get it${name}. That sounds frustrating. Let's take it one step at a time.`;

    case "happy":
      return `Nice${name}. I'm glad to hear that.`;

    case "excited":
      return `Wow${name}, that's exciting! I like that energy.`;

    case "in_love":
      return `Aww${name}. I like being your robot friend too.`;

    default:
      return `I am listening${name}.`;
  }
}
