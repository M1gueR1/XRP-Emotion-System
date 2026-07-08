export type CustomEmotionKey =
  | "idle"
  | "happy"
  | "sad"
  | "excited"
  | "in_love"
  | "upset";


export type CustomEmotionKeywordRule = {
  id: string;
  phrase: string;
  emotionKey: CustomEmotionKey;
  emotionId: number;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};


export type CustomEmotionKeywordMatch = {
  rule: CustomEmotionKeywordRule;
  matchedText: string;
};


const CUSTOM_EMOTION_KEYWORDS_STORAGE_KEY =
  "xrp-emotion-system:custom-emotion-keywords:v1";

export const CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT =
  "xrp:custom-emotion-keywords-changed";


export const CUSTOM_EMOTION_OPTIONS:
  Array<{
    key: CustomEmotionKey;
    label: string;
    emotionId: number;
  }> = [
    {
      key: "idle",
      label: "Idle",
      emotionId: 0,
    },
    {
      key: "happy",
      label: "Happy",
      emotionId: 1,
    },
    {
      key: "sad",
      label: "Sad",
      emotionId: 9,
    },
    {
      key: "excited",
      label: "Excited",
      emotionId: 3,
    },
    {
      key: "in_love",
      label: "In love",
      emotionId: 12,
    },
    {
      key: "upset",
      label: "Upset",
      emotionId: 8,
    },
  ];


function nowIso(): string {
  return new Date().toISOString();
}


function hasBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}


function safeRandomId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


export function normalizeKeywordText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function emitKeywordsChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT
    )
  );
}


function readRulesFromStorage():
  CustomEmotionKeywordRule[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        CUSTOM_EMOTION_KEYWORDS_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw) as CustomEmotionKeywordRule[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}


function writeRulesToStorage(
  rules: CustomEmotionKeywordRule[]
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    CUSTOM_EMOTION_KEYWORDS_STORAGE_KEY,
    JSON.stringify(rules)
  );

  emitKeywordsChanged();
}


export function getEmotionOptionByKey(
  emotionKey: CustomEmotionKey
) {
  return (
    CUSTOM_EMOTION_OPTIONS.find(
      (option) =>
        option.key === emotionKey
    ) ?? CUSTOM_EMOTION_OPTIONS[0]
  );
}


export function getCustomEmotionKeywordRules():
  CustomEmotionKeywordRule[] {
  return readRulesFromStorage()
    .sort((a, b) => {
      if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
      }

      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      return b.phrase.length - a.phrase.length;
    });
}


export function upsertCustomEmotionKeywordRule(
  input: {
    id?: string;
    phrase: string;
    emotionKey: CustomEmotionKey;
    priority?: number;
    enabled?: boolean;
  }
): CustomEmotionKeywordRule {
  const phrase =
    input.phrase.trim();

  if (!phrase) {
    throw new Error(
      "Keyword phrase is required."
    );
  }

  const emotionOption =
    getEmotionOptionByKey(
      input.emotionKey
    );

  const rules =
    readRulesFromStorage();

  const existing =
    input.id
      ? rules.find(
          (rule) => rule.id === input.id
        )
      : rules.find(
          (rule) =>
            normalizeKeywordText(rule.phrase) ===
            normalizeKeywordText(phrase)
        );

  if (existing) {
    const updated:
      CustomEmotionKeywordRule = {
        ...existing,
        phrase,
        emotionKey:
          emotionOption.key,
        emotionId:
          emotionOption.emotionId,
        priority:
          input.priority ??
          existing.priority,
        enabled:
          input.enabled ??
          existing.enabled,
        updatedAt: nowIso(),
      };

    writeRulesToStorage(
      rules.map((rule) =>
        rule.id === updated.id
          ? updated
          : rule
      )
    );

    return updated;
  }

  const createdAt =
    nowIso();

  const created:
    CustomEmotionKeywordRule = {
      id: safeRandomId(),
      phrase,
      emotionKey:
        emotionOption.key,
      emotionId:
        emotionOption.emotionId,
      priority:
        input.priority ?? 80,
      enabled:
        input.enabled ?? true,
      createdAt,
      updatedAt: createdAt,
    };

  writeRulesToStorage([
    ...rules,
    created,
  ]);

  return created;
}


export function deleteCustomEmotionKeywordRule(
  ruleId: string
): void {
  const rules =
    readRulesFromStorage();

  writeRulesToStorage(
    rules.filter(
      (rule) => rule.id !== ruleId
    )
  );
}


export function toggleCustomEmotionKeywordRule(
  ruleId: string
): CustomEmotionKeywordRule | null {
  const rules =
    readRulesFromStorage();

  const rule =
    rules.find(
      (item) => item.id === ruleId
    );

  if (!rule) {
    return null;
  }

  const updated:
    CustomEmotionKeywordRule = {
      ...rule,
      enabled: !rule.enabled,
      updatedAt: nowIso(),
    };

  writeRulesToStorage(
    rules.map((item) =>
      item.id === ruleId
        ? updated
        : item
    )
  );

  return updated;
}


export function findMatchingCustomEmotionKeyword(
  text: string
): CustomEmotionKeywordMatch | null {
  const normalizedText =
    normalizeKeywordText(text);

  if (!normalizedText) {
    return null;
  }

  const matches =
    getCustomEmotionKeywordRules()
      .filter((rule) => rule.enabled)
      .map((rule) => {
        const normalizedPhrase =
          normalizeKeywordText(
            rule.phrase
          );

        if (!normalizedPhrase) {
          return null;
        }

        const isMatch =
          normalizedText.includes(
            normalizedPhrase
          );

        if (!isMatch) {
          return null;
        }

        return {
          rule,
          matchedText:
            rule.phrase,
        } satisfies CustomEmotionKeywordMatch;
      })
      .filter(
        (
          match
        ): match is CustomEmotionKeywordMatch =>
          match !== null
      );

  if (matches.length === 0) {
    return null;
  }

  return matches.sort((a, b) => {
    if (
      b.rule.priority !==
      a.rule.priority
    ) {
      return (
        b.rule.priority -
        a.rule.priority
      );
    }

    return (
      b.rule.phrase.length -
      a.rule.phrase.length
    );
  })[0];
}


export function getCustomEmotionKeywordSummary():
  string {
  const rules =
    getCustomEmotionKeywordRules();

  if (rules.length === 0) {
    return "No custom emotion keywords yet.";
  }

  return rules
    .map(
      (rule) =>
        `${rule.phrase} -> ${rule.emotionKey}`
    )
    .join("; ");
}
