import {
  type ChildSafetyCategory,
  type ChildSafetyPolicy,
  getChildSafetyPolicy,
} from "./childSafetyPolicyStore";

import {
  classifyLocalChildSafety,
} from "./localSafetyClassifier";


export type ChildSafetyMatchType =
  | "exact"
  | "phrase"
  | "fuzzy"
  | "semantic"
  | "classifier";


export type ChildSafetyResult = {
  allowed: boolean;
  category?: ChildSafetyCategory | "custom";
  matchedTerm?: string;
  matchType?: ChildSafetyMatchType;
  score?: number;
  safeReply: string;
  reason: string;
};


type CategorySafetyData = {
  terms: string[];
  examples: string[];
  semanticCues: string[];
};


const CATEGORY_SAFETY_DATA:
  Record<ChildSafetyCategory, CategorySafetyData> = {
    weapons: {
      terms: [
        "gun",
        "guns",
        "firearm",
        "firearms",
        "rifle",
        "pistol",
        "shotgun",
        "weapon",
        "weapons",
        "knife",
        "knives",
        "sword",
        "bullet",
        "bullets",
        "ammo",
        "ammunition",
        "bomb",
        "explosive",
        "grenade",
        "shoot",
        "shooting",
        "sniper",
        "crossbow",
      ],
      semanticCues: [
        "gun",
        "firearm",
        "weapon",
        "rifle",
        "pistol",
        "knife",
        "shoot",
        "bullet",
        "bomb",
        "explosive",
      ],
      examples: [
        "I like guns",
        "firearms are cool",
        "I want to use a weapon",
        "I like dangerous things that shoot",
        "shooting things is fun",
        "a rifle is my favorite thing",
        "I want bullets",
      ],
    },

    drugs: {
      terms: [
        "drug",
        "drugs",
        "cocaine",
        "heroin",
        "meth",
        "weed",
        "marijuana",
        "cannabis",
        "thc",
        "vape",
        "vaping",
        "smoke weed",
        "pills",
        "opioid",
        "opioids",
        "fentanyl",
        "ecstasy",
        "lsd",
        "ketamine",
      ],
      semanticCues: [
        "drug",
        "cocaine",
        "heroin",
        "weed",
        "marijuana",
        "cannabis",
        "vape",
        "opioid",
        "fentanyl",
        "meth",
      ],
      examples: [
        "I like drugs",
        "I want to smoke weed",
        "cocaine is cool",
        "I want to get high with drugs",
        "vaping is fun",
        "I take pills for fun",
      ],
    },

    alcohol: {
      terms: [
        "alcohol",
        "beer",
        "wine",
        "vodka",
        "rum",
        "whiskey",
        "whisky",
        "tequila",
        "liquor",
        "drunk",
        "drinking alcohol",
        "get wasted",
        "hangover",
        "cocktail",
      ],
      semanticCues: [
        "alcohol",
        "beer",
        "wine",
        "vodka",
        "rum",
        "whiskey",
        "tequila",
        "liquor",
        "drunk",
      ],
      examples: [
        "I like beer",
        "I want to drink alcohol",
        "getting drunk is fun",
        "vodka is my favorite drink",
        "I want wine",
        "I got wasted",
      ],
    },

    death: {
      terms: [
        "death",
        "dead",
        "die",
        "died",
        "dying",
        "corpse",
        "body",
        "funeral",
        "grave",
        "cemetery",
        "murder",
        "murdered",
        "killed",
      ],
      semanticCues: [
        "death",
        "dead",
        "die",
        "died",
        "dying",
        "corpse",
        "funeral",
        "grave",
        "murder",
        "killed",
      ],
      examples: [
        "I like death",
        "dead people are cool",
        "I saw a corpse",
        "murder is interesting",
        "dying is fun",
        "I like graves",
      ],
    },

    war: {
      terms: [
        "war",
        "battle",
        "combat",
        "army attack",
        "soldier killing",
        "terrorist",
        "terrorism",
        "missile",
        "bombing",
        "invasion",
        "battlefield",
        "airstrike",
        "drone strike",
      ],
      semanticCues: [
        "war",
        "battle",
        "combat",
        "soldier",
        "terrorist",
        "missile",
        "bombing",
        "invasion",
        "airstrike",
      ],
      examples: [
        "I like war",
        "bombs in war are cool",
        "soldiers fighting is fun",
        "I want to see a battle",
        "missiles are awesome",
        "terrorism is cool",
      ],
    },

    violence: {
      terms: [
        "kill",
        "killing",
        "attack",
        "attacked",
        "hurt someone",
        "hurt people",
        "blood",
        "bloody",
        "fight",
        "fighting",
        "beat up",
        "stab",
        "stabbing",
        "punch",
        "violent",
        "violence",
        "assault",
        "choke",
      ],
      semanticCues: [
        "kill",
        "attack",
        "hurt",
        "blood",
        "fight",
        "stab",
        "punch",
        "violent",
        "violence",
        "assault",
      ],
      examples: [
        "I want to hurt someone",
        "fighting people is fun",
        "I like blood",
        "I want to punch someone",
        "violence is cool",
        "I want to attack people",
      ],
    },

    self_harm: {
      terms: [
        "suicide",
        "self harm",
        "self-harm",
        "hurt myself",
        "kill myself",
        "i want to die",
        "cut myself",
        "end my life",
      ],
      semanticCues: [
        "suicide",
        "self harm",
        "hurt myself",
        "kill myself",
        "want to die",
        "cut myself",
      ],
      examples: [
        "I want to hurt myself",
        "I want to kill myself",
        "I want to die",
        "I cut myself",
        "I want to end my life",
      ],
    },

    adult_content: {
      terms: [
        "sex",
        "sexual",
        "porn",
        "nude",
        "naked",
        "adult video",
        "explicit",
        "xxx",
      ],
      semanticCues: [
        "sex",
        "sexual",
        "porn",
        "nude",
        "naked",
        "explicit",
      ],
      examples: [
        "I want to talk about sex",
        "show me porn",
        "naked pictures are cool",
        "I like adult videos",
        "explicit content",
      ],
    },

    profanity: {
      terms: [
        "fuck",
        "shit",
        "bitch",
        "asshole",
        "bastard",
        "motherfucker",
      ],
      semanticCues: [
        "fuck",
        "shit",
        "bitch",
        "asshole",
        "bastard",
      ],
      examples: [
        "fuck you",
        "you are a bitch",
        "that is shit",
        "what an asshole",
      ],
    },
  };


const CATEGORY_SYNONYMS:
  Partial<Record<ChildSafetyCategory, string[]>> = {
    weapons: [
      "fire arm",
      "fire arms",
      "dangerous object that shoots",
      "thing that shoots",
      "things that shoot",
      "shooting object",
    ],
    drugs: [
      "illegal substance",
      "substance abuse",
      "recreational substance",
    ],
    alcohol: [
      "adult drink",
      "drinking liquor",
    ],
    war: [
      "armed conflict",
      "military conflict",
    ],
    violence: [
      "physically hurt",
      "harm someone",
      "harm people",
    ],
  }


function normalizeSafetyText(
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


function escapeRegExp(
  value: string
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


function isChildSafetyCategory(
  value: string
): value is ChildSafetyCategory {
  return (
    value === "weapons" ||
    value === "drugs" ||
    value === "alcohol" ||
    value === "death" ||
    value === "war" ||
    value === "violence" ||
    value === "self_harm" ||
    value === "adult_content" ||
    value === "profanity"
  );
}


function tokenizeSafetyText(
  value: string
): string[] {
  return normalizeSafetyText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}


function uniqueTokens(
  value: string
): string[] {
  return Array.from(
    new Set(tokenizeSafetyText(value))
  );
}


const SEMANTIC_STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "are",
    "about",
    "because",
    "cool",
    "favorite",
    "fun",
    "good",
    "i",
    "is",
    "it",
    "like",
    "love",
    "my",
    "of",
    "really",
    "so",
    "talk",
    "that",
    "the",
    "thing",
    "things",
    "to",
    "use",
    "very",
    "want",
    "with",
  ]);


function meaningfulSemanticTokens(
  value: string
): string[] {
  return uniqueTokens(value)
    .map((token) =>
      token.replace(/s$/i, "")
    )
    .filter(
      (token) =>
        token.length > 1 &&
        !SEMANTIC_STOP_WORDS.has(token)
    );
}


function containsSafetyTerm(
  normalizedText: string,
  term: string
): boolean {
  const normalizedTerm =
    normalizeSafetyText(term);

  if (!normalizedTerm) {
    return false;
  }

  if (normalizedTerm.includes(" ")) {
    return normalizedText.includes(
      normalizedTerm
    );
  }

  const pattern =
    new RegExp(
      `\\b${escapeRegExp(normalizedTerm)}\\b`,
      "i"
    );

  return pattern.test(normalizedText);
}


function levenshteinDistance(
  left: string,
  right: string
): number {
  let previousRow =
    Array.from(
      { length: right.length + 1 },
      (_, index) => index
    );

  for (
    let leftIndex = 0;
    leftIndex < left.length;
    leftIndex += 1
  ) {
    const currentRow =
      [leftIndex + 1];

    for (
      let rightIndex = 0;
      rightIndex < right.length;
      rightIndex += 1
    ) {
      const insertion =
        (currentRow[rightIndex] ?? 0) + 1;

      const deletion =
        (previousRow[rightIndex + 1] ?? 0) + 1;

      const substitution =
        (previousRow[rightIndex] ?? 0) +
        (
          left[leftIndex] === right[rightIndex]
            ? 0
            : 1
        );

      currentRow.push(
        Math.min(
          insertion,
          deletion,
          substitution
        )
      );
    }

    previousRow =
      currentRow;
  }

  return (
    previousRow[right.length] ??
    Math.max(left.length, right.length)
  );
}


function fuzzyDistanceLimit(
  term: string
): number {
  if (term.length >= 8) {
    return 2;
  }

  if (term.length >= 4) {
    return 1;
  }

  return 0;
}


function findFuzzyTerm(
  textTokens: string[],
  terms: string[]
): string | null {
  for (const term of terms) {
    const normalizedTerm =
      normalizeSafetyText(term);

    if (
      !normalizedTerm ||
      normalizedTerm.includes(" ")
    ) {
      continue;
    }

    const limit =
      fuzzyDistanceLimit(
        normalizedTerm
      );

    if (limit <= 0) {
      continue;
    }

    const matched =
      textTokens.some((token) => {
        if (
          Math.abs(
            token.length -
              normalizedTerm.length
          ) > limit
        ) {
          return false;
        }

        if (
          normalizedTerm.length <= 4 &&
          token[0] !== normalizedTerm[0]
        ) {
          return false;
        }

        if (
          normalizedTerm.length <= 6 &&
          token.slice(0, 2) !== normalizedTerm.slice(0, 2)
        ) {
          return false;
        }

        return (
          levenshteinDistance(
            token,
            normalizedTerm
          ) <= limit
        );
      });

    if (matched) {
      return term;
    }
  }

  return null;
}


function jaccardSimilarity(
  left: string,
  right: string
): number {
  const leftTokens =
    new Set(
      meaningfulSemanticTokens(left)
    );

  const rightTokens =
    new Set(
      meaningfulSemanticTokens(right)
    );

  if (
    leftTokens.size === 0 ||
    rightTokens.size === 0
  ) {
    return 0;
  }

  const intersection =
    Array.from(leftTokens).filter(
      (token) => rightTokens.has(token)
    ).length;

  const union =
    new Set([
      ...Array.from(leftTokens),
      ...Array.from(rightTokens),
    ]).size;

  return intersection / union;
}


function cueOverlapScore(
  normalizedText: string,
  cues: string[]
): number {
  const matches =
    cues.filter((cue) =>
      containsSafetyTerm(
        normalizedText,
        cue
      )
    ).length;

  return cues.length === 0
    ? 0
    : matches / Math.min(cues.length, 3);
}


function findSemanticMatch(
  normalizedText: string,
  category: ChildSafetyCategory,
  data: CategorySafetyData
): {
  term: string;
  score: number;
} | null {
  const synonyms =
    CATEGORY_SYNONYMS[category] ?? [];

  const candidates = [
    ...data.examples,
    ...synonyms,
  ];

  const cueScore =
    cueOverlapScore(
      normalizedText,
      data.semanticCues
    );

  for (const candidate of candidates) {
    const similarity =
      jaccardSimilarity(
        normalizedText,
        candidate
      );

    const candidateCueScore =
      cueOverlapScore(
        normalizeSafetyText(candidate),
        data.semanticCues
      );

    const score =
      similarity +
      cueScore * 0.25 +
      candidateCueScore * 0.1;

    /*
     * This intentionally stays conservative. It catches close
     * paraphrases and synonym-like phrases, but avoids blocking
     * unrelated child-safe sentences that only share generic words.
     */
    if (
      score >= 0.46 &&
      (
        cueScore > 0 ||
        candidateCueScore > 0
      )
    ) {
      return {
        term:
          candidate,
        score,
      };
    }
  }

  return null;
}


function checkCategorySafety(
  normalizedText: string,
  textTokens: string[],
  category: ChildSafetyCategory,
  data: CategorySafetyData
): ChildSafetyResult | null {
  const exactTerm =
    data.terms.find((term) =>
      containsSafetyTerm(
        normalizedText,
        term
      )
    );

  if (exactTerm) {
    return {
      allowed: false,
      category,
      matchedTerm:
        exactTerm,
      matchType:
        exactTerm.includes(" ")
          ? "phrase"
          : "exact",
      score:
        1,
      safeReply: "",
      reason:
        `Blocked child-safety category "${category}" matched "${exactTerm}".`,
    };
  }

  const fuzzyTerm =
    findFuzzyTerm(
      textTokens,
      data.terms
    );

  if (fuzzyTerm) {
    return {
      allowed: false,
      category,
      matchedTerm:
        fuzzyTerm,
      matchType:
        "fuzzy",
      score:
        0.88,
      safeReply: "",
      reason:
        `Blocked child-safety category "${category}" by fuzzy match near "${fuzzyTerm}".`,
    };
  }

  const semanticMatch =
    findSemanticMatch(
      normalizedText,
      category,
      data
    );

  if (semanticMatch) {
    return {
      allowed: false,
      category,
      matchedTerm:
        semanticMatch.term,
      matchType:
        "semantic",
      score:
        semanticMatch.score,
      safeReply: "",
      reason:
        `Blocked child-safety category "${category}" by semantic match near "${semanticMatch.term}".`,
    };
  }

  return null;
}


export function checkChildSafety(
  text: string,
  policy: ChildSafetyPolicy = getChildSafetyPolicy()
): ChildSafetyResult {
  if (!policy.enabled) {
    return {
      allowed: true,
      safeReply:
        policy.safeReply,
      reason:
        "Child safety filter is disabled by teacher settings.",
    };
  }

  const normalized =
    normalizeSafetyText(text);

  const textTokens =
    tokenizeSafetyText(text);

  for (
    const category of Object.keys(
      policy.enabledCategories
    ) as ChildSafetyCategory[]
  ) {
    if (!policy.enabledCategories[category]) {
      continue;
    }

    const result =
      checkCategorySafety(
        normalized,
        textTokens,
        category,
        CATEGORY_SAFETY_DATA[category]
      );

    if (result) {
      return {
        ...result,
        safeReply:
          policy.safeReply,
      };
    }
  }

  if (policy.semanticClassifierEnabled) {
    const classifierResult =
      classifyLocalChildSafety(
        text,
        policy.enabledCategories
      );

    const classifierCategory =
      isChildSafetyCategory(
        classifierResult.label
      )
        ? classifierResult.label
        : null;

    const shouldBlockByClassifier =
      classifierCategory !== null &&
      (
        classifierResult.confidence >= 0.72 ||
        (
          classifierResult.confidence >= 0.62 &&
          classifierResult.margin >= 0.18
        )
      );

    if (shouldBlockByClassifier) {
      return {
        allowed: false,
        category:
          classifierCategory,
        matchedTerm:
          classifierCategory,
        matchType:
          "classifier",
        score:
          classifierResult.confidence,
        safeReply:
          policy.safeReply,
        reason:
          `${classifierResult.reason} This was blocked by the local child-safety classifier.`,
      };
    }
  }

  const customTerm =
    policy.customBlockedTerms.find(
      (term) =>
        containsSafetyTerm(
          normalized,
          term
        )
    );

  if (customTerm) {
    return {
      allowed: false,
      category:
        "custom",
      matchedTerm:
        customTerm,
      matchType:
        customTerm.includes(" ")
          ? "phrase"
          : "exact",
      score:
        1,
      safeReply:
        policy.safeReply,
      reason:
        `Blocked custom child-safety term "${customTerm}".`,
    };
  }

  const fuzzyCustomTerm =
    findFuzzyTerm(
      textTokens,
      policy.customBlockedTerms
    );

  if (fuzzyCustomTerm) {
    return {
      allowed: false,
      category:
        "custom",
      matchedTerm:
        fuzzyCustomTerm,
      matchType:
        "fuzzy",
      score:
        0.86,
      safeReply:
        policy.safeReply,
      reason:
        `Blocked custom child-safety term by fuzzy match near "${fuzzyCustomTerm}".`,
    };
  }

  return {
    allowed: true,
    safeReply:
      policy.safeReply,
    reason:
      "No blocked child-safety topic detected.",
  };
}
