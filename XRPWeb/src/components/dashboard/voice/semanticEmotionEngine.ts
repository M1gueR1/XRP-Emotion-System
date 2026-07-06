import {
  pipeline,
} from "@huggingface/transformers";

import {
  classifyVoiceCommand,
  normalizeTranscript,
} from "./emotionIntentEngine";

import {
  inferEventSentiment,
} from "./eventSentimentEngine";

import {
  inferAdvancedEmotionReasoning,
} from "./advancedEmotionReasoner";

import {
  chooseBestEmotionCandidate,
} from "./emotionDecisionRouter";

import type {
  VoiceCommandAction,
  VoiceCommandResult,
} from "./voiceCommandTypes";



export const SEMANTIC_MODEL_ID =
  "Xenova/all-MiniLM-L6-v2";


const SEMANTIC_THRESHOLD = 0.54;


type EmotionAction =
  Extract<
    VoiceCommandAction,
    | "turn_happy"
    | "turn_sad"
    | "turn_excited"
    | "turn_in_love"
  >;


type FeatureExtractionPipeline = (
  text: string,
  options?: {
    pooling?: "mean";
    normalize?: boolean;
  }
) => Promise<{
  data?: ArrayLike<number>;
}>;


type SemanticEmotionExample = {
  text: string;
  action: EmotionAction;
  intentLabel: string;
};


type EmbeddedSemanticExample =
  SemanticEmotionExample & {
    embedding: number[];
  };


type SemanticEmotionMatch = {
  example: EmbeddedSemanticExample;
  similarity: number;
};


const SEMANTIC_EXAMPLES:
  SemanticEmotionExample[] = [
    /*
     * Happy / positive calm.
     */
    {
      text: "that was fun",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "I enjoyed this",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "this made me smile",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "I feel good today",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "that was a good job",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "I am proud of this",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "thank you for helping me",
      action: "turn_happy",
      intentLabel: "Happy",
    },
    {
      text: "everything is going well",
      action: "turn_happy",
      intentLabel: "Happy",
    },

    /*
     * Sad / negative affect.
     */
    {
      text: "I feel lonely today",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "I am worried about this",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "that was very difficult",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "I had a hard day",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "I feel stressed",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "I am disappointed",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "this makes me feel bad",
      action: "turn_sad",
      intentLabel: "Sad",
    },
    {
      text: "I do not feel okay",
      action: "turn_sad",
      intentLabel: "Sad",
    },

    /*
     * Excited / high energy.
     */
    {
      text: "this is amazing",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "I am ready for the challenge",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "let's do this",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "I am very excited",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "that is awesome",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "this is so cool",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "I cannot wait to start",
      action: "turn_excited",
      intentLabel: "Excited",
    },
    {
      text: "we are going to win",
      action: "turn_excited",
      intentLabel: "Excited",
    },

    /*
     * In love / affection / friendship.
     */
    {
      text: "you are my friend",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "I like working with you",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "I love you",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "you help me a lot",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "I trust you",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "you are very kind",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "you are cute",
      action: "turn_in_love",
      intentLabel: "In love",
    },
    {
      text: "we make a good team",
      action: "turn_in_love",
      intentLabel: "In love",
    },
  ];


let featureExtractorPromise:
  Promise<FeatureExtractionPipeline> | null =
    null;


let embeddedExamplesPromise:
  Promise<EmbeddedSemanticExample[]> | null =
    null;


function getFeatureExtractor():
  Promise<FeatureExtractionPipeline> {
  if (!featureExtractorPromise) {
    featureExtractorPromise =
      pipeline(
        "feature-extraction",
        SEMANTIC_MODEL_ID
      ) as Promise<FeatureExtractionPipeline>;
  }

  return featureExtractorPromise;
}


function toNumberArray(
  output: {
    data?: ArrayLike<number>;
  } | ArrayLike<number>
): number[] {
  const data =
    "data" in output && output.data
      ? output.data
      : output;

  return Array.from(
    data as ArrayLike<number>
  );
}


async function embedText(
  text: string
): Promise<number[]> {
  const extractor =
    await getFeatureExtractor();

  const output =
    await extractor(text, {
      pooling: "mean",
      normalize: true,
    });

  return toNumberArray(output);
}


function dotProduct(
  left: number[],
  right: number[]
): number {
  const length =
    Math.min(
      left.length,
      right.length
    );

  let total = 0;

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    total +=
      left[index] * right[index];
  }

  return total;
}


function cosineSimilarity(
  left: number[],
  right: number[]
): number {
  /*
   * Embeddings are requested with normalize:true,
   * so dot product is already cosine similarity.
   */
  return dotProduct(
    left,
    right
  );
}


async function getEmbeddedExamples():
  Promise<EmbeddedSemanticExample[]> {
  if (!embeddedExamplesPromise) {
    embeddedExamplesPromise =
      Promise.all(
        SEMANTIC_EXAMPLES.map(
          async (example) => ({
            ...example,
            embedding:
              await embedText(
                example.text
              ),
          })
        )
      );
  }

  return embeddedExamplesPromise;
}


export async function warmupSemanticEmotionModel():
  Promise<void> {
  await Promise.all([
    getFeatureExtractor(),
    getEmbeddedExamples(),
  ]);
}


function repeatedEmotionCount(
  words: string[],
  targetWords: string[]
): number {
  const targets =
    new Set(targetWords);

  const count =
    words.filter((word) =>
      targets.has(word)
    ).length;

  return Math.min(
    Math.max(
      count,
      1
    ),
    3
  );
}


function repeatWordsForAction(
  action: EmotionAction
): string[] {
  switch (action) {
    case "turn_happy":
      return [
        "happy",
        "feliz",
      ];

    case "turn_sad":
      return [
        "sad",
        "triste",
      ];

    case "turn_excited":
      return [
        "excited",
        "wow",
        "emocionado",
      ];

    case "turn_in_love":
      return [
        "love",
        "friend",
        "enamorado",
        "enamorada",
      ];
  }
}


function confidenceFromSimilarity(
  similarity: number
): number {
  if (similarity <= SEMANTIC_THRESHOLD) {
    return 0;
  }

  return Math.min(
    0.96,
    0.62 +
      (similarity - SEMANTIC_THRESHOLD) *
        0.95
  );
}


async function inferSemanticEmotion(
  transcript: string
): Promise<VoiceCommandResult | null> {
  const normalized =
    normalizeTranscript(
      transcript
    );

  if (!normalized) {
    return null;
  }

  const tokenList =
    normalized
      .split(" ")
      .filter(Boolean);

  const [
    transcriptEmbedding,
    embeddedExamples,
  ] = await Promise.all([
    embedText(normalized),
    getEmbeddedExamples(),
  ]);

  const bestMatch =
    embeddedExamples
      .map<SemanticEmotionMatch>(
        (example) => ({
          example,
          similarity:
            cosineSimilarity(
              transcriptEmbedding,
              example.embedding
            ),
        })
      )
      .sort(
        (left, right) =>
          right.similarity -
          left.similarity
      )[0];

  if (
    !bestMatch ||
    bestMatch.similarity <
      SEMANTIC_THRESHOLD
  ) {
    return null;
  }

  const action =
    bestMatch.example.action;

  const confidenceScore =
    confidenceFromSimilarity(
      bestMatch.similarity
    );

  return {
    transcript:
      normalized,

    action,

    confidenceLabel:
      `Semantic ML matched "${bestMatch.example.text}" with similarity ${bestMatch.similarity.toFixed(
        2
      )}`,

    repeatCount:
      repeatedEmotionCount(
        tokenList,
        repeatWordsForAction(
          action
        )
      ),

    source: "semantic_ml",

    matchedRuleId:
      `semantic.${bestMatch.example.intentLabel.toLowerCase().replace(
        /\s+/g,
        "_"
      )}`,

    intentLabel:
      bestMatch.example.intentLabel,

    intentCategory:
      "emotion",

    confidenceScore,

    semanticMatchText:
      bestMatch.example.text,

    semanticSimilarity:
      bestMatch.similarity,

    semanticModelId:
      SEMANTIC_MODEL_ID,
  };
}


function createIdleFallbackResult(
  transcript: string
): VoiceCommandResult {
  const normalized =
    normalizeTranscript(
      transcript
    );

  return {
    transcript:
      normalized,

    action:
      "turn_idle",

    confidenceLabel:
      "No strong emotion was detected, so the robot stays in idle/neutral mode.",

    repeatCount: 1,

    source:
      "advanced_reasoner",

    matchedRuleId:
      "fallback.unknown_to_idle",

    intentLabel:
      "Idle",

    intentCategory:
      "emotion",

    confidenceScore:
      0.45,

    advancedIntentLabel:
      "Idle",

    contextReason:
      "Fallback behavior: unknown conversational input is treated as neutral idle instead of unknown.",
  };
}


export async function classifyVoiceCommandWithSemantic(
  transcript: string,
  options: {
    semanticEnabled?: boolean;
    advancedReasoningEnabled?: boolean;
  } = {}
): Promise<VoiceCommandResult> {
  const {
    semanticEnabled = true,
    advancedReasoningEnabled = false,
  } = options;

  const baseResult =
    classifyVoiceCommand(
      transcript
    );

  /*
   * Safety, movement, macros, direct emotions, and high-confidence
   * intent-engine results remain deterministic and fast.
   *
   * If the intent engine does not know what to do, the decision
   * router collects multiple emotional candidates and chooses
   * the best one instead of returning the first match.
   */
  if (
    baseResult.action !== "unknown"
  ) {
    return baseResult;
  }

  const candidates:
    Array<VoiceCommandResult | null> = [];

  const eventResult =
    inferEventSentiment(
      transcript
    );

  candidates.push(
    eventResult
  );

  if (semanticEnabled) {
    try {
      const semanticResult =
        await inferSemanticEmotion(
          transcript
        );

      candidates.push(
        semanticResult
      );
    } catch (error) {
      console.warn(
        "[semantic-ml] unavailable:",
        error
      );
    }
  }

  if (advancedReasoningEnabled) {
    try {
      const advancedResult =
        await inferAdvancedEmotionReasoning(
          transcript
        );

      candidates.push(
        advancedResult
      );
    } catch (error) {
      console.warn(
        "[advanced-reasoner] unavailable:",
        error
      );
    }
  }

  return chooseBestEmotionCandidate(
    candidates,
    createIdleFallbackResult(
      transcript
    )
  );
}
