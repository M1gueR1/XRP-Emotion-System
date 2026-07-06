import {
  pipeline,
} from "@huggingface/transformers";

import {
  normalizeTranscript,
} from "./emotionIntentEngine";

import type {
  VoiceCommandAction,
  VoiceCommandResult,
} from "./voiceCommandTypes";


export const ADVANCED_REASONER_MODEL_ID =
  "Xenova/all-MiniLM-L6-v2";


const ADVANCED_REASONER_THRESHOLD = 0.46;


type AdvancedReasonerAction =
  Extract<
    VoiceCommandAction,
    | "turn_idle"
    | "turn_happy"
    | "turn_sad"
    | "turn_excited"
    | "turn_in_love"
    | "turn_upset"
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


type AdvancedEmotionPrototype = {
  id: string;
  text: string;
  action: AdvancedReasonerAction;
  intentLabel:
    | "Idle"
    | "Happy"
    | "Sad"
    | "Excited"
    | "In love"
    | "Upset";
  reason: string;
};


type EmbeddedAdvancedEmotionPrototype =
  AdvancedEmotionPrototype & {
    embedding: number[];
  };


type AdvancedEmotionMatch = {
  prototype: EmbeddedAdvancedEmotionPrototype;
  similarity: number;
};


/*
 * Important:
 * These are not exact commands. They are semantic examples.
 *
 * The model converts both the student's sentence and these
 * examples into embeddings, then compares meaning. This makes
 * sentences like "today I need to study" map to Idle even if
 * that exact sentence was not written as a command.
 *
 * We keep the labels small on purpose because the XRP currently
 * has a limited emotion set.
 */
const ADVANCED_EMOTION_PROTOTYPES:
  AdvancedEmotionPrototype[] = [
    /*
     * Idle / neutral / focused.
     * This is for responsibility, studying, waiting, listening,
     * or calm task-oriented statements.
     */
    {
      id: "advanced.idle.study_today",
      text: "I need to study today",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is talking about studying or responsibility, which is neutral/focused.",
    },
    {
      id: "advanced.idle.homework",
      text: "I have homework to do",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is describing a task, not a strong positive or negative emotion.",
    },
    {
      id: "advanced.idle.class",
      text: "I have to go to class",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is describing a normal academic activity.",
    },
    {
      id: "advanced.idle.focus",
      text: "I need to focus on my work",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is expressing focus or attention.",
    },
    {
      id: "advanced.idle.listening",
      text: "I am listening and paying attention",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is calm and attentive.",
    },
    {
      id: "advanced.idle.plan",
      text: "I have a lot of things to do today",
      action: "turn_idle",
      intentLabel: "Idle",
      reason:
        "The student is talking about plans or obligations.",
    },

    /*
     * Upset / stressed.
     * This is different from sad: it captures frustration,
     * pressure, nervousness, or feeling overwhelmed.
     */
    {
      id: "advanced.upset.hate_you",
      text: "I hate you",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student expresses rejection or anger toward the robot.",
    },
    {
      id: "advanced.upset.do_not_like_you",
      text: "I do not like you",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student expresses negative interpersonal emotion.",
    },
    {
      id: "advanced.upset.you_are_mean",
      text: "You are mean to me",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student sounds hurt, angry, or frustrated with the robot.",
    },
    {
      id: "advanced.upset.you_hurt_me",
      text: "You hurt my feelings",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student expresses emotional hurt.",
    },
    {
      id: "advanced.upset.stressed",
      text: "I am stressed about my work",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student sounds stressed or under pressure.",
    },
    {
      id: "advanced.upset.overwhelmed",
      text: "I feel overwhelmed because I have too much to do",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student sounds overwhelmed.",
    },
    {
      id: "advanced.upset.nervous_exam",
      text: "I am nervous about my exam",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student sounds nervous or anxious.",
    },
    {
      id: "advanced.upset.frustrated",
      text: "This is frustrating and annoying",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student sounds frustrated.",
    },
    {
      id: "advanced.upset.too_much_study",
      text: "I need to study but I feel stressed",
      action: "turn_upset",
      intentLabel: "Upset",
      reason:
        "The student connects studying with stress.",
    },

    /*
     * Happy.
     */
    {
      id: "advanced.happy.good_day",
      text: "Today was a good day",
      action: "turn_happy",
      intentLabel: "Happy",
      reason:
        "The student describes a positive day.",
    },
    {
      id: "advanced.happy.enjoyed",
      text: "I enjoyed this activity",
      action: "turn_happy",
      intentLabel: "Happy",
      reason:
        "The student expresses enjoyment.",
    },
    {
      id: "advanced.happy.relief",
      text: "I feel relieved because everything went well",
      action: "turn_happy",
      intentLabel: "Happy",
      reason:
        "The student feels relieved or positive.",
    },
    {
      id: "advanced.happy.like_this",
      text: "I like this",
      action: "turn_happy",
      intentLabel: "Happy",
      reason:
        "The student expresses positive preference.",
    },
    {
      id: "advanced.happy.success",
      text: "I finished my work successfully",
      action: "turn_happy",
      intentLabel: "Happy",
      reason:
        "The student describes success.",
    },

    /*
     * Sad.
     */
    {
      id: "advanced.sad.bad_day",
      text: "Today was a bad day",
      action: "turn_sad",
      intentLabel: "Sad",
      reason:
        "The student describes a negative day.",
    },
    {
      id: "advanced.sad.disappointed",
      text: "I feel disappointed about what happened",
      action: "turn_sad",
      intentLabel: "Sad",
      reason:
        "The student sounds disappointed.",
    },
    {
      id: "advanced.sad.lonely",
      text: "I feel lonely today",
      action: "turn_sad",
      intentLabel: "Sad",
      reason:
        "The student expresses loneliness.",
    },
    {
      id: "advanced.sad.missed",
      text: "I missed something important",
      action: "turn_sad",
      intentLabel: "Sad",
      reason:
        "The student describes a negative or regretful event.",
    },
    {
      id: "advanced.sad.problem",
      text: "Something bad happened to me",
      action: "turn_sad",
      intentLabel: "Sad",
      reason:
        "The student describes something negative.",
    },

    /*
     * Excited.
     */
    {
      id: "advanced.excited.cant_wait",
      text: "I cannot wait to start",
      action: "turn_excited",
      intentLabel: "Excited",
      reason:
        "The student expresses anticipation and energy.",
    },
    {
      id: "advanced.excited.challenge",
      text: "I am ready for the challenge",
      action: "turn_excited",
      intentLabel: "Excited",
      reason:
        "The student sounds ready and excited.",
    },
    {
      id: "advanced.excited.amazing",
      text: "This is amazing and awesome",
      action: "turn_excited",
      intentLabel: "Excited",
      reason:
        "The student expresses high positive energy.",
    },
    {
      id: "advanced.excited.win",
      text: "We are going to win",
      action: "turn_excited",
      intentLabel: "Excited",
      reason:
        "The student expresses excitement about winning.",
    },
    {
      id: "advanced.excited.robot_working",
      text: "The robot is working and this is cool",
      action: "turn_excited",
      intentLabel: "Excited",
      reason:
        "The student is excited about the robot working.",
    },

    /*
     * In love / affection.
     */
    {
      id: "advanced.in_love.friend",
      text: "You are my friend",
      action: "turn_in_love",
      intentLabel: "In love",
      reason:
        "The student expresses friendship or affection toward the robot.",
    },
    {
      id: "advanced.in_love.kind",
      text: "You are very kind to me",
      action: "turn_in_love",
      intentLabel: "In love",
      reason:
        "The student expresses affection or appreciation.",
    },
    {
      id: "advanced.in_love.trust",
      text: "I trust you",
      action: "turn_in_love",
      intentLabel: "In love",
      reason:
        "The student expresses trust.",
    },
    {
      id: "advanced.in_love.team",
      text: "We make a good team",
      action: "turn_in_love",
      intentLabel: "In love",
      reason:
        "The student expresses connection and teamwork.",
    },
    {
      id: "advanced.in_love.help",
      text: "You help me a lot",
      action: "turn_in_love",
      intentLabel: "In love",
      reason:
        "The student appreciates help from the robot.",
    },
  ];


let featureExtractorPromise:
  Promise<FeatureExtractionPipeline> | null =
    null;


let embeddedPrototypesPromise:
  Promise<EmbeddedAdvancedEmotionPrototype[]> | null =
    null;


function getFeatureExtractor():
  Promise<FeatureExtractionPipeline> {
  if (!featureExtractorPromise) {
    featureExtractorPromise =
      pipeline(
        "feature-extraction",
        ADVANCED_REASONER_MODEL_ID
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
   * so the dot product is cosine similarity.
   */
  return dotProduct(
    left,
    right
  );
}


async function getEmbeddedPrototypes():
  Promise<EmbeddedAdvancedEmotionPrototype[]> {
  if (!embeddedPrototypesPromise) {
    embeddedPrototypesPromise =
      Promise.all(
        ADVANCED_EMOTION_PROTOTYPES.map(
          async (prototype) => ({
            ...prototype,
            embedding:
              await embedText(
                prototype.text
              ),
          })
        )
      );
  }

  return embeddedPrototypesPromise;
}


export async function warmupAdvancedEmotionReasoner():
  Promise<void> {
  await Promise.all([
    getFeatureExtractor(),
    getEmbeddedPrototypes(),
  ]);
}


function confidenceFromSimilarity(
  similarity: number
): number {
  if (
    similarity <=
    ADVANCED_REASONER_THRESHOLD
  ) {
    return 0;
  }

  return Math.min(
    0.94,
    0.58 +
      (similarity -
        ADVANCED_REASONER_THRESHOLD) *
        0.95
  );
}


function repeatCountForAction(
  action: AdvancedReasonerAction
): number {
  if (
    action === "turn_idle" ||
    action === "turn_upset"
  ) {
    return 1;
  }

  return 1;
}


function shouldRejectWeakGenericMatch(
  normalized: string,
  match: AdvancedEmotionMatch
): boolean {
  /*
   * Prevent very generic sentences from being forced into
   * a strong emotion when the model is uncertain.
   */
  if (
    match.similarity >= 0.58
  ) {
    return false;
  }

  const genericShortSentence =
    normalized.split(" ").length <= 3;

  return genericShortSentence;
}


export async function inferAdvancedEmotionReasoning(
  transcript: string
): Promise<VoiceCommandResult | null> {
  const normalized =
    normalizeTranscript(
      transcript
    );

  if (!normalized) {
    return null;
  }

  const [
    transcriptEmbedding,
    embeddedPrototypes,
  ] = await Promise.all([
    embedText(normalized),
    getEmbeddedPrototypes(),
  ]);

  const bestMatch =
    embeddedPrototypes
      .map<AdvancedEmotionMatch>(
        (prototype) => ({
          prototype,
          similarity:
            cosineSimilarity(
              transcriptEmbedding,
              prototype.embedding
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
      ADVANCED_REASONER_THRESHOLD ||
    shouldRejectWeakGenericMatch(
      normalized,
      bestMatch
    )
  ) {
    return null;
  }

  const {
    prototype,
    similarity,
  } = bestMatch;

  const confidenceScore =
    confidenceFromSimilarity(
      similarity
    );

  return {
    transcript:
      normalized,

    action:
      prototype.action,

    confidenceLabel:
      `Advanced reasoner matched "${prototype.text}" with similarity ${similarity.toFixed(
        2
      )}. ${prototype.reason}`,

    repeatCount:
      repeatCountForAction(
        prototype.action
      ),

    source:
      "advanced_reasoner",

    matchedRuleId:
      prototype.id,

    intentLabel:
      prototype.intentLabel,

    intentCategory:
      "emotion",

    confidenceScore,

    semanticMatchText:
      prototype.text,

    semanticSimilarity:
      similarity,

    semanticModelId:
      ADVANCED_REASONER_MODEL_ID,

    advancedIntentLabel:
      prototype.intentLabel,

    advancedMatchedPrototype:
      prototype.text,

    advancedSimilarity:
      similarity,
  };
}
