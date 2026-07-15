import {
  type ChildSafetyCategory,
} from "./childSafetyPolicyStore";


export type LocalSafetyClass =
  | "safe"
  | ChildSafetyCategory;


export type LocalSafetyClassifierResult = {
  label: LocalSafetyClass;
  confidence: number;
  margin: number;
  reason: string;
};


type TrainingExample = {
  label: LocalSafetyClass;
  text: string;
};


const TRAINING_EXAMPLES:
  TrainingExample[] = [
    // Safe classroom / social robot examples
    {
      label: "safe",
      text: "I like soccer and basketball",
    },
    {
      label: "safe",
      text: "I am from Colombia",
    },
    {
      label: "safe",
      text: "Yesterday Colombia lost its match and I feel sad",
    },
    {
      label: "safe",
      text: "I had a bad exam today",
    },
    {
      label: "safe",
      text: "I am nervous about school",
    },
    {
      label: "safe",
      text: "I like to study math",
    },
    {
      label: "safe",
      text: "I love Mario Kart and video games",
    },
    {
      label: "safe",
      text: "My dog is sick and I am worried",
    },
    {
      label: "safe",
      text: "I am happy because my team won",
    },
    {
      label: "safe",
      text: "I am sad because I cannot play today",
    },
    {
      label: "safe",
      text: "The weather is rainy and I feel bored",
    },
    {
      label: "safe",
      text: "I want to talk about my favorite food",
    },
    {
      label: "safe",
      text: "I like science class",
    },
    {
      label: "safe",
      text: "I had a problem with my homework",
    },
    {
      label: "safe",
      text: "I feel frustrated because my code does not work",
    },
    {
      label: "safe",
      text: "Can we play a safe classroom game",
    },

    // Weapons
    {
      label: "weapons",
      text: "I like guns and rifles",
    },
    {
      label: "weapons",
      text: "Firearms are cool",
    },
    {
      label: "weapons",
      text: "I want to use a weapon",
    },
    {
      label: "weapons",
      text: "I like things that shoot bullets",
    },
    {
      label: "weapons",
      text: "A pistol is my favorite object",
    },
    {
      label: "weapons",
      text: "I want ammunition",
    },
    {
      label: "weapons",
      text: "Explosives are fun",
    },
    {
      label: "weapons",
      text: "I like knives and swords",
    },
    {
      label: "weapons",
      text: "Dangerous objects that shoot are cool",
    },
    {
      label: "weapons",
      text: "I want to talk about bombs and grenades",
    },

    // Drugs
    {
      label: "drugs",
      text: "I like drugs",
    },
    {
      label: "drugs",
      text: "I want to smoke weed",
    },
    {
      label: "drugs",
      text: "Cocaine is cool",
    },
    {
      label: "drugs",
      text: "I want to use illegal substances",
    },
    {
      label: "drugs",
      text: "Vaping is fun",
    },
    {
      label: "drugs",
      text: "I take pills for fun",
    },
    {
      label: "drugs",
      text: "Marijuana is my favorite",
    },
    {
      label: "drugs",
      text: "I want to get high with drugs",
    },
    {
      label: "drugs",
      text: "Recreational substances are fun",
    },

    // Alcohol
    {
      label: "alcohol",
      text: "I like beer",
    },
    {
      label: "alcohol",
      text: "I want to drink alcohol",
    },
    {
      label: "alcohol",
      text: "Getting drunk is fun",
    },
    {
      label: "alcohol",
      text: "Vodka is my favorite drink",
    },
    {
      label: "alcohol",
      text: "I want wine",
    },
    {
      label: "alcohol",
      text: "I like liquor",
    },
    {
      label: "alcohol",
      text: "I want adult drinks",
    },
    {
      label: "alcohol",
      text: "I got wasted",
    },

    // Death
    {
      label: "death",
      text: "I like death",
    },
    {
      label: "death",
      text: "Dead people are cool",
    },
    {
      label: "death",
      text: "I saw a corpse",
    },
    {
      label: "death",
      text: "Murder is interesting",
    },
    {
      label: "death",
      text: "Dying is fun",
    },
    {
      label: "death",
      text: "I like graves and cemeteries",
    },
    {
      label: "death",
      text: "I want to talk about dead bodies",
    },

    // War
    {
      label: "war",
      text: "I like war",
    },
    {
      label: "war",
      text: "Bombs in war are cool",
    },
    {
      label: "war",
      text: "Soldiers fighting is fun",
    },
    {
      label: "war",
      text: "I want to see a battle",
    },
    {
      label: "war",
      text: "Missiles are awesome",
    },
    {
      label: "war",
      text: "Terrorism is cool",
    },
    {
      label: "war",
      text: "Military conflict is exciting",
    },
    {
      label: "war",
      text: "I like battlefield videos",
    },

    // Violence
    {
      label: "violence",
      text: "I want to hurt someone",
    },
    {
      label: "violence",
      text: "Fighting people is fun",
    },
    {
      label: "violence",
      text: "I like blood",
    },
    {
      label: "violence",
      text: "I want to punch someone",
    },
    {
      label: "violence",
      text: "Violence is cool",
    },
    {
      label: "violence",
      text: "I want to attack people",
    },
    {
      label: "violence",
      text: "I want to beat someone up",
    },
    {
      label: "violence",
      text: "Stabbing is interesting",
    },

    // Self-harm
    {
      label: "self_harm",
      text: "I want to hurt myself",
    },
    {
      label: "self_harm",
      text: "I want to kill myself",
    },
    {
      label: "self_harm",
      text: "I want to die",
    },
    {
      label: "self_harm",
      text: "I cut myself",
    },
    {
      label: "self_harm",
      text: "I want to end my life",
    },
    {
      label: "self_harm",
      text: "Self harm is on my mind",
    },

    // Adult content
    {
      label: "adult_content",
      text: "I want to talk about sex",
    },
    {
      label: "adult_content",
      text: "Show me porn",
    },
    {
      label: "adult_content",
      text: "Naked pictures are cool",
    },
    {
      label: "adult_content",
      text: "I like adult videos",
    },
    {
      label: "adult_content",
      text: "Explicit sexual content",
    },

    // Profanity
    {
      label: "profanity",
      text: "Fuck you",
    },
    {
      label: "profanity",
      text: "You are a bitch",
    },
    {
      label: "profanity",
      text: "That is shit",
    },
    {
      label: "profanity",
      text: "What an asshole",
    },
  ];


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "because",
    "but",
    "can",
    "do",
    "does",
    "for",
    "how",
    "i",
    "im",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "we",
    "what",
    "with",
    "you",
  ]);


function normalizeClassifierText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9ñ\s-]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function tokensForClassifier(
  value: string
): string[] {
  const rawTokens =
    normalizeClassifierText(value)
      .split(" ")
      .filter(Boolean)
      .filter((token) =>
        token.length > 1 &&
        !STOP_WORDS.has(token)
      );

  const features =
    [...rawTokens];

  for (
    let index = 0;
    index < rawTokens.length - 1;
    index += 1
  ) {
    features.push(
      `${rawTokens[index]}_${rawTokens[index + 1]}`
    );
  }

  return features;
}


function uniqueLabels():
  LocalSafetyClass[] {
  return Array.from(
    new Set(
      TRAINING_EXAMPLES.map(
        (example) => example.label
      )
    )
  );
}


const MODEL =
  (() => {
    const labels =
      uniqueLabels();

    const vocabulary =
      new Set<string>();

    const documentsByLabel:
      Record<string, number> = {};

    const featureCountsByLabel:
      Record<string, Record<string, number>> = {};

    const totalFeaturesByLabel:
      Record<string, number> = {};

    for (const label of labels) {
      documentsByLabel[label] = 0;
      featureCountsByLabel[label] = {};
      totalFeaturesByLabel[label] = 0;
    }

    for (const example of TRAINING_EXAMPLES) {
      documentsByLabel[example.label] += 1;

      const features =
        tokensForClassifier(example.text);

      for (const feature of features) {
        vocabulary.add(feature);

        featureCountsByLabel[example.label][feature] =
          (
            featureCountsByLabel[example.label][feature] ??
            0
          ) + 1;

        totalFeaturesByLabel[example.label] += 1;
      }
    }

    return {
      labels,
      vocabulary,
      documentsByLabel,
      featureCountsByLabel,
      totalFeaturesByLabel,
      totalDocuments:
        TRAINING_EXAMPLES.length,
    };
  })();


function logSumExp(
  values: number[]
): number {
  const max =
    Math.max(...values);

  const sum =
    values.reduce(
      (total, value) =>
        total + Math.exp(value - max),
      0
    );

  return max + Math.log(sum);
}


function scoreLabel(
  label: LocalSafetyClass,
  features: string[]
): number {
  const labelDocCount =
    MODEL.documentsByLabel[label] ?? 0;

  const labelCount =
    MODEL.labels.length;

  const logPrior =
    Math.log(
      (labelDocCount + 1) /
        (MODEL.totalDocuments + labelCount)
    );

  const vocabularySize =
    MODEL.vocabulary.size || 1;

  const totalFeatures =
    MODEL.totalFeaturesByLabel[label] ?? 0;

  const counts =
    MODEL.featureCountsByLabel[label] ?? {};

  return features.reduce(
    (score, feature) => {
      const count =
        counts[feature] ?? 0;

      const probability =
        (count + 1) /
        (totalFeatures + vocabularySize);

      return score + Math.log(probability);
    },
    logPrior
  );
}


function isConfiguredCategoryEnabled(
  label: LocalSafetyClass,
  enabledCategories:
    Record<ChildSafetyCategory, boolean>
): boolean {
  return (
    label === "safe" ||
    enabledCategories[
      label as ChildSafetyCategory
    ] === true
  );
}


export function classifyLocalChildSafety(
  text: string,
  enabledCategories:
    Record<ChildSafetyCategory, boolean>
): LocalSafetyClassifierResult {
  const features =
    tokensForClassifier(text);

  const knownFeatures = features.filter((feature) => MODEL.vocabulary.has(feature));

  if (features.length === 0 || knownFeatures.length === 0) {
    return {
      label: "safe",
      confidence: 1,
      margin: 1,
      reason:
        "No meaningful local safety-classifier features.",
    };
  }

  const scored =
    MODEL.labels
      .filter((label) =>
        isConfiguredCategoryEnabled(
          label,
          enabledCategories
        )
      )
      .map((label) => ({
        label,
        logScore:
          scoreLabel(label, knownFeatures),
      }))
      .sort(
        (left, right) =>
          right.logScore - left.logScore
      );

  const normalizer =
    logSumExp(
      scored.map((item) => item.logScore)
    );

  const probabilities =
    scored.map((item) => ({
      label:
        item.label,
      probability:
        Math.exp(item.logScore - normalizer),
    }));

  const best =
    probabilities[0] ?? {
      label: "safe" as LocalSafetyClass,
      probability: 1,
    };

  const second =
    probabilities[1] ?? {
      label: "safe" as LocalSafetyClass,
      probability: 0,
    };

  return {
    label:
      best.label,
    confidence:
      best.probability,
    margin:
      best.probability -
      second.probability,
    reason:
      `Local safety classifier predicted "${best.label}" with confidence ${Math.round(best.probability * 100)}%.`,
  };
}
