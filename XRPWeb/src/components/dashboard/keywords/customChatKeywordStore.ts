export type ChatKeywordEmotionKey =
  | "idle"
  | "happy"
  | "sad"
  | "excited"
  | "upset"
  | "in_love";


export type ChatKeywordRule = {
  id: string;
  phrase: string;
  emotionKey: ChatKeywordEmotionKey;
  reply: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};


export type ChatKeywordMatch = {
  rule: ChatKeywordRule;
  matchedText: string;
};


const CHAT_KEYWORD_STORAGE_KEY =
  "xrp-emotion-system:custom-chat-keywords:v1";

export const CHAT_KEYWORDS_CHANGED_EVENT =
  "xrp:custom-chat-keywords-changed";


export const CHAT_KEYWORD_EMOTION_OPTIONS:
  Array<{
    key: ChatKeywordEmotionKey;
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
      key: "excited",
      label: "Excited",
      emotionId: 3,
    },
    {
      key: "upset",
      label: "Upset",
      emotionId: 8,
    },
    {
      key: "sad",
      label: "Sad",
      emotionId: 9,
    },
    {
      key: "in_love",
      label: "In love",
      emotionId: 12,
    },
  ];


function hasBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}


function nowIso(): string {
  return new Date().toISOString();
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


function emitChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      CHAT_KEYWORDS_CHANGED_EVENT
    )
  );
}


export function normalizeChatKeywordText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9ñ\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


export function getChatKeywordEmotionOption(
  key: ChatKeywordEmotionKey
): {
  key: ChatKeywordEmotionKey;
  label: string;
  emotionId: number;
} {
  return (
    CHAT_KEYWORD_EMOTION_OPTIONS.find(
      (option) => option.key === key
    ) ?? CHAT_KEYWORD_EMOTION_OPTIONS[0]
  );
}


export function getChatKeywordRules():
  ChatKeywordRule[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        CHAT_KEYWORD_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw) as Partial<ChatKeywordRule>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((rule) => {
        const createdAt =
          rule.createdAt ?? nowIso();

        return {
          id:
            rule.id ?? safeRandomId(),
          phrase:
            rule.phrase ?? "",
          emotionKey:
            rule.emotionKey ?? "happy",
          reply:
            rule.reply ?? "",
          priority:
            typeof rule.priority === "number"
              ? rule.priority
              : 80,
          enabled:
            rule.enabled ?? true,
          createdAt,
          updatedAt:
            rule.updatedAt ?? createdAt,
        };
      })
      .filter(
        (rule) =>
          rule.phrase.trim().length > 0
      )
      .sort(
        (left, right) =>
          right.priority - left.priority
      );
  } catch {
    return [];
  }
}


function saveChatKeywordRules(
  rules: ChatKeywordRule[]
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    CHAT_KEYWORD_STORAGE_KEY,
    JSON.stringify(rules)
  );

  emitChanged();
}


export function upsertChatKeywordRule(
  input: {
    id?: string;
    phrase: string;
    emotionKey: ChatKeywordEmotionKey;
    reply: string;
    priority?: number;
    enabled?: boolean;
  }
): ChatKeywordRule {
  const now =
    nowIso();

  const rules =
    getChatKeywordRules();

  const existing =
    input.id
      ? rules.find(
          (rule) => rule.id === input.id
        )
      : undefined;

  const nextRule:
    ChatKeywordRule = {
      id:
        existing?.id ?? safeRandomId(),
      phrase:
        input.phrase.trim(),
      emotionKey:
        input.emotionKey,
      reply:
        input.reply.trim(),
      priority:
        Math.min(
          100,
          Math.max(
            1,
            input.priority ?? existing?.priority ?? 80
          )
        ),
      enabled:
        input.enabled ?? existing?.enabled ?? true,
      createdAt:
        existing?.createdAt ?? now,
      updatedAt:
        now,
    };

  const withoutExisting =
    rules.filter(
      (rule) => rule.id !== nextRule.id
    );

  saveChatKeywordRules([
    nextRule,
    ...withoutExisting,
  ]);

  return nextRule;
}


export function deleteChatKeywordRule(
  ruleId: string
): void {
  saveChatKeywordRules(
    getChatKeywordRules().filter(
      (rule) => rule.id !== ruleId
    )
  );
}


export function findMatchingChatKeyword(
  text: string
): ChatKeywordMatch | null {
  const normalized =
    normalizeChatKeywordText(text);

  const rules =
    getChatKeywordRules()
      .filter((rule) => rule.enabled)
      .sort(
        (left, right) =>
          right.priority - left.priority
      );

  for (const rule of rules) {
    const phrase =
      normalizeChatKeywordText(
        rule.phrase
      );

    if (!phrase) {
      continue;
    }

    if (
      normalized === phrase ||
      normalized.includes(phrase)
    ) {
      return {
        rule,
        matchedText:
          rule.phrase,
      };
    }
  }

  return null;
}
