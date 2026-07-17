import {
  getOfficialVoiceKeywordEmotionTargetById,
  getOfficialVoiceKeywordEmotionTargets,
  type VoiceKeywordEmotionTarget,
} from "./customVoiceKeywordEmotionCatalog";


export type CustomEmotionKey = string;


export type CustomEmotionKeywordRule = {
  schemaVersion: 2;

  id: string;
  commandId: number;
  commandKey: `custom:${number}`;

  phrase: string;
  normalizedPhrase: string;

  targetEmotionId: number;
  targetEmotionUniqueName: string;
  targetEmotionDisplayName: string;
  targetEmotionSource: "official" | "custom";
  targetMissing: boolean;

  automaticallyPlayEmotion: boolean;
  exposeInBlockly: boolean;

  /* Compatibility aliases for existing chat integrations. */
  emotionKey: string;
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

const NEXT_CUSTOM_COMMAND_ID_STORAGE_KEY =
  "xrp-emotion-system:custom-voice-command-next-id:v2";

export const CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT =
  "xrp:custom-emotion-keywords-changed";

export const CUSTOM_VOICE_COMMAND_ID_MIN = 1000;
export const CUSTOM_VOICE_COMMAND_ID_MAX = 65535;

const MAX_VOICE_PHRASE_LENGTH = 120;


export const CUSTOM_EMOTION_OPTIONS =
  getOfficialVoiceKeywordEmotionTargets().map(
    (target) => ({
      key: target.uniqueName,
      label: target.displayName,
      emotionId: target.emotionId,
    })
  );


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


function isValidCommandId(
  value: unknown
): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >=
      CUSTOM_VOICE_COMMAND_ID_MIN &&
    Number(value) <=
      CUSTOM_VOICE_COMMAND_ID_MAX
  );
}


function readNextCommandId(): number {
  if (!hasBrowserStorage()) {
    return CUSTOM_VOICE_COMMAND_ID_MIN;
  }

  const raw = window.localStorage.getItem(
    NEXT_CUSTOM_COMMAND_ID_STORAGE_KEY
  );

  const parsed = Number(raw);

  return isValidCommandId(parsed)
    ? parsed
    : CUSTOM_VOICE_COMMAND_ID_MIN;
}


function allocateCommandId(
  usedIds: Set<number>
): number {
  let candidate = Math.max(
    readNextCommandId(),
    CUSTOM_VOICE_COMMAND_ID_MIN
  );

  while (
    usedIds.has(candidate) &&
    candidate <= CUSTOM_VOICE_COMMAND_ID_MAX
  ) {
    candidate += 1;
  }

  if (candidate > CUSTOM_VOICE_COMMAND_ID_MAX) {
    throw new Error(
      "No custom voice command IDs are available."
    );
  }

  usedIds.add(candidate);

  if (hasBrowserStorage()) {
    const next = Math.min(
      candidate + 1,
      CUSTOM_VOICE_COMMAND_ID_MAX
    );

    window.localStorage.setItem(
      NEXT_CUSTOM_COMMAND_ID_STORAGE_KEY,
      String(next)
    );
  }

  return candidate;
}


function legacyTarget(
  rawRule: Record<string, unknown>
): VoiceKeywordEmotionTarget {
  const legacyId = Number(
    rawRule.targetEmotionId ??
      rawRule.emotionId
  );

  const byId =
    getOfficialVoiceKeywordEmotionTargetById(
      legacyId
    );

  if (byId) {
    return byId;
  }

  const legacyName = String(
    rawRule.targetEmotionUniqueName ??
      rawRule.emotionKey ??
      "idle"
  );

  return (
    getOfficialVoiceKeywordEmotionTargets()
      .find(
        (target) =>
          target.uniqueName === legacyName
      ) ??
    getOfficialVoiceKeywordEmotionTargets()[0]!
  );
}


function migrateRule(
  rawValue: unknown,
  usedIds: Set<number>
): CustomEmotionKeywordRule | null {
  if (
    !rawValue ||
    typeof rawValue !== "object"
  ) {
    return null;
  }

  const rawRule = rawValue as
    Record<string, unknown>;

  const phrase = String(
    rawRule.phrase ?? ""
  ).trim();

  const normalizedPhrase =
    normalizeKeywordText(phrase);

  if (!normalizedPhrase) {
    return null;
  }

  const rawCommandId = rawRule.commandId;
  let commandId: number;

  if (
    !isValidCommandId(rawCommandId) ||
    usedIds.has(rawCommandId)
  ) {
    commandId = allocateCommandId(
      usedIds
    );
  } else {
    commandId = rawCommandId;
    usedIds.add(rawCommandId);
  }

  const fallbackTarget =
    legacyTarget(rawRule);

  const source =
    rawRule.targetEmotionSource === "custom"
      ? "custom"
      : rawRule.targetEmotionSource === "official"
        ? "official"
        : fallbackTarget.source;

  const targetEmotionId = Number(
    rawRule.targetEmotionId ??
      rawRule.emotionId ??
      fallbackTarget.emotionId
  );

  const safeTargetEmotionId =
    Number.isInteger(targetEmotionId) &&
    targetEmotionId >= 0 &&
    targetEmotionId <= 255
      ? targetEmotionId
      : fallbackTarget.emotionId;

  const targetEmotionUniqueName = String(
    rawRule.targetEmotionUniqueName ??
      rawRule.emotionKey ??
      fallbackTarget.uniqueName
  );

  const targetEmotionDisplayName = String(
    rawRule.targetEmotionDisplayName ??
      fallbackTarget.displayName
  );

  const createdAt = String(
    rawRule.createdAt ?? nowIso()
  );

  return {
    schemaVersion: 2,
    id: String(
      rawRule.id ?? safeRandomId()
    ),
    commandId,
    commandKey:
      `custom:${commandId}`,
    phrase,
    normalizedPhrase,
    targetEmotionId:
      safeTargetEmotionId,
    targetEmotionUniqueName,
    targetEmotionDisplayName,
    targetEmotionSource: source,
    targetMissing:
      rawRule.targetMissing === true,
    automaticallyPlayEmotion:
      rawRule.automaticallyPlayEmotion !== false,
    exposeInBlockly:
      rawRule.exposeInBlockly !== false,
    emotionKey:
      targetEmotionUniqueName,
    emotionId:
      safeTargetEmotionId,
    priority: Number.isFinite(
      Number(rawRule.priority)
    )
      ? Math.min(
          Math.max(
            Number(rawRule.priority),
            1
          ),
          100
        )
      : 80,
    enabled:
      rawRule.enabled !== false,
    createdAt,
    updatedAt: String(
      rawRule.updatedAt ?? createdAt
    ),
  };
}


function readRulesFromStorage():
  CustomEmotionKeywordRule[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      CUSTOM_EMOTION_KEYWORDS_STORAGE_KEY
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const usedIds = new Set<number>();
    const migrated = parsed
      .map((rule) =>
        migrateRule(rule, usedIds)
      )
      .filter(
        (
          rule
        ): rule is CustomEmotionKeywordRule =>
          rule !== null
      );

    const serialized =
      JSON.stringify(migrated);

    if (serialized !== JSON.stringify(parsed)) {
      window.localStorage.setItem(
        CUSTOM_EMOTION_KEYWORDS_STORAGE_KEY,
        serialized
      );
    }

    return migrated;
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
  emotionKey: string
) {
  return (
    CUSTOM_EMOTION_OPTIONS.find(
      (option) =>
        option.key === emotionKey
    ) ?? CUSTOM_EMOTION_OPTIONS[0]!
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
    targetEmotion?: VoiceKeywordEmotionTarget;
    emotionKey?: string;
    priority?: number;
    enabled?: boolean;
    automaticallyPlayEmotion?: boolean;
    exposeInBlockly?: boolean;
  }
): CustomEmotionKeywordRule {
  const phrase = input.phrase.trim();
  const normalizedPhrase =
    normalizeKeywordText(phrase);

  if (!normalizedPhrase) {
    throw new Error(
      "Keyword phrase is required."
    );
  }

  if (phrase.length > MAX_VOICE_PHRASE_LENGTH) {
    throw new Error(
      `Keyword phrases must be ${MAX_VOICE_PHRASE_LENGTH} characters or fewer.`
    );
  }

  const rules = readRulesFromStorage();

  const duplicate = rules.find(
    (rule) =>
      rule.normalizedPhrase ===
        normalizedPhrase &&
      rule.id !== input.id &&
      rule.enabled
  );

  if (duplicate) {
    throw new Error(
      "An enabled voice keyword already uses this phrase."
    );
  }

  const existing = input.id
    ? rules.find(
        (rule) => rule.id === input.id
      )
    : undefined;

  const target =
    input.targetEmotion ??
    getOfficialVoiceKeywordEmotionTargets()
      .find(
        (option) =>
          option.uniqueName ===
          input.emotionKey
      ) ??
    getOfficialVoiceKeywordEmotionTargets()[0]!;

  if (
    !Number.isInteger(target.emotionId) ||
    target.emotionId < 0 ||
    target.emotionId > 255
  ) {
    throw new Error(
      "Select a valid emotion target."
    );
  }

  if (existing) {
    const updated:
      CustomEmotionKeywordRule = {
      ...existing,
      phrase,
      normalizedPhrase,
      targetEmotionId:
        target.emotionId,
      targetEmotionUniqueName:
        target.uniqueName,
      targetEmotionDisplayName:
        target.displayName,
      targetEmotionSource:
        target.source,
      targetMissing: false,
      automaticallyPlayEmotion:
        input.automaticallyPlayEmotion ??
        existing.automaticallyPlayEmotion,
      exposeInBlockly:
        input.exposeInBlockly ??
        existing.exposeInBlockly,
      emotionKey: target.uniqueName,
      emotionId: target.emotionId,
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

  const usedIds = new Set(
    rules.map((rule) => rule.commandId)
  );

  const commandId =
    allocateCommandId(usedIds);

  const createdAt = nowIso();

  const created:
    CustomEmotionKeywordRule = {
    schemaVersion: 2,
    id: safeRandomId(),
    commandId,
    commandKey: `custom:${commandId}`,
    phrase,
    normalizedPhrase,
    targetEmotionId: target.emotionId,
    targetEmotionUniqueName:
      target.uniqueName,
    targetEmotionDisplayName:
      target.displayName,
    targetEmotionSource: target.source,
    targetMissing: false,
    automaticallyPlayEmotion:
      input.automaticallyPlayEmotion ?? true,
    exposeInBlockly:
      input.exposeInBlockly ?? true,
    emotionKey: target.uniqueName,
    emotionId: target.emotionId,
    priority: input.priority ?? 80,
    enabled: input.enabled ?? true,
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
  const rules = readRulesFromStorage();

  writeRulesToStorage(
    rules.filter(
      (rule) => rule.id !== ruleId
    )
  );
}


export function toggleCustomEmotionKeywordRule(
  ruleId: string
): CustomEmotionKeywordRule | null {
  const rules = readRulesFromStorage();
  const rule = rules.find(
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


export function reconcileCustomEmotionKeywordTargets(
  targets: VoiceKeywordEmotionTarget[]
): boolean {
  const rules = readRulesFromStorage();
  let changed = false;

  const reconciled = rules.map((rule) => {
    const target = targets.find(
      (candidate) =>
        candidate.emotionId ===
        rule.targetEmotionId
    );

    if (!target) {
      if (
        rule.targetEmotionSource === "custom" &&
        !rule.targetMissing
      ) {
        changed = true;
        return {
          ...rule,
          targetMissing: true,
          updatedAt: nowIso(),
        };
      }

      return rule;
    }

    if (
      rule.targetMissing ||
      rule.targetEmotionUniqueName !==
        target.uniqueName ||
      rule.targetEmotionDisplayName !==
        target.displayName ||
      rule.targetEmotionSource !==
        target.source
    ) {
      changed = true;

      return {
        ...rule,
        targetEmotionUniqueName:
          target.uniqueName,
        targetEmotionDisplayName:
          target.displayName,
        targetEmotionSource:
          target.source,
        targetMissing: false,
        emotionKey: target.uniqueName,
        emotionId: target.emotionId,
        updatedAt: nowIso(),
      };
    }

    return rule;
  });

  if (changed) {
    writeRulesToStorage(reconciled);
  }

  return changed;
}


export function markCustomEmotionKeywordTargetMissing(
  emotionId: number
): boolean {
  const rules = readRulesFromStorage();
  let changed = false;

  const updatedRules = rules.map((rule) => {
    if (
      rule.targetEmotionSource !== "custom" ||
      rule.targetEmotionId !== emotionId ||
      rule.targetMissing
    ) {
      return rule;
    }

    changed = true;

    return {
      ...rule,
      targetMissing: true,
      updatedAt: nowIso(),
    };
  });

  if (changed) {
    writeRulesToStorage(updatedRules);
  }

  return changed;
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
        if (
          !normalizedText.includes(
            rule.normalizedPhrase
          )
        ) {
          return null;
        }

        return {
          rule,
          matchedText: rule.phrase,
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
        `${rule.phrase} -> ${rule.targetEmotionDisplayName}`
    )
    .join("; ");
}
