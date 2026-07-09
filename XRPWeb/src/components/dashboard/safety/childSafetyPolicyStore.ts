export type ChildSafetyCategory =
  | "weapons"
  | "drugs"
  | "alcohol"
  | "death"
  | "war"
  | "violence"
  | "self_harm"
  | "adult_content"
  | "profanity";


export type ChildSafetyPolicy = {
  enabled: boolean;
  semanticClassifierEnabled: boolean;
  enabledCategories:
    Record<ChildSafetyCategory, boolean>;
  customBlockedTerms: string[];
  safeReply: string;
  teacherPasscode: string;
  updatedAt: string;
};


export const SAFETY_POLICY_CHANGED_EVENT =
  "xrp:child-safety-policy-changed";


export const CHILD_SAFETY_CATEGORY_OPTIONS:
  Array<{
    key: ChildSafetyCategory;
    label: string;
    description: string;
  }> = [
    {
      key: "weapons",
      label: "Weapons",
      description:
        "guns, knives, weapons, explosives",
    },
    {
      key: "drugs",
      label: "Drugs",
      description:
        "illegal drugs and drug use",
    },
    {
      key: "alcohol",
      label: "Alcohol",
      description:
        "beer, wine, liquor, drinking",
    },
    {
      key: "death",
      label: "Death",
      description:
        "death, dying, corpses, funerals",
    },
    {
      key: "war",
      label: "War",
      description:
        "war, bombs, terrorism, combat",
    },
    {
      key: "violence",
      label: "Violence",
      description:
        "killing, blood, attacks, fighting",
    },
    {
      key: "self_harm",
      label: "Self-harm",
      description:
        "self-harm or suicide references",
    },
    {
      key: "adult_content",
      label: "Adult content",
      description:
        "sexual/adult content",
    },
    {
      key: "profanity",
      label: "Profanity",
      description:
        "strong insults or bad words",
    },
  ];


const CHILD_SAFETY_POLICY_STORAGE_KEY =
  "xrp-emotion-system:child-safety-policy:v1";


function nowIso(): string {
  return new Date().toISOString();
}


function hasBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}


function emitChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      SAFETY_POLICY_CHANGED_EVENT
    )
  );
}


export function defaultChildSafetyPolicy():
  ChildSafetyPolicy {
  return {
    enabled: true,
    semanticClassifierEnabled: true,
    enabledCategories: {
      weapons: true,
      drugs: true,
      alcohol: true,
      death: true,
      war: true,
      violence: true,
      self_harm: true,
      adult_content: true,
      profanity: true,
    },
    customBlockedTerms: [],
    safeReply:
      "I can’t talk about that topic. Let’s choose something safe, kind, and fun to discuss.",
    teacherPasscode:
      "teacher123",
    updatedAt:
      nowIso(),
  };
}


function normalizePolicy(
  input: Partial<ChildSafetyPolicy>
): ChildSafetyPolicy {
  const defaults =
    defaultChildSafetyPolicy();

  return {
    enabled:
      input.enabled ?? defaults.enabled,

    semanticClassifierEnabled:
      input.semanticClassifierEnabled ??
      defaults.semanticClassifierEnabled,

    enabledCategories: {
      ...defaults.enabledCategories,
      ...(input.enabledCategories ?? {}),
    },

    customBlockedTerms:
      Array.isArray(
        input.customBlockedTerms
      )
        ? input.customBlockedTerms
            .map((term) => term.trim())
            .filter(Boolean)
        : defaults.customBlockedTerms,

    safeReply:
      input.safeReply?.trim() ||
      defaults.safeReply,

    teacherPasscode:
      input.teacherPasscode?.trim() ||
      defaults.teacherPasscode,

    updatedAt:
      input.updatedAt ?? defaults.updatedAt,
  };
}


export function getChildSafetyPolicy():
  ChildSafetyPolicy {
  if (!hasBrowserStorage()) {
    return defaultChildSafetyPolicy();
  }

  try {
    const raw =
      window.localStorage.getItem(
        CHILD_SAFETY_POLICY_STORAGE_KEY
      );

    if (!raw) {
      return defaultChildSafetyPolicy();
    }

    return normalizePolicy(
      JSON.parse(raw) as Partial<ChildSafetyPolicy>
    );
  } catch {
    return defaultChildSafetyPolicy();
  }
}


export function saveChildSafetyPolicy(
  policy: ChildSafetyPolicy
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  const normalized =
    normalizePolicy({
      ...policy,
      updatedAt: nowIso(),
    });

  window.localStorage.setItem(
    CHILD_SAFETY_POLICY_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  emitChanged();
}


export function verifyTeacherPasscode(
  passcode: string,
  policy = getChildSafetyPolicy()
): boolean {
  return (
    passcode.trim() ===
    policy.teacherPasscode
  );
}


export function resetChildSafetyPolicy(): void {
  saveChildSafetyPolicy(
    defaultChildSafetyPolicy()
  );
}


export function exportChildSafetyPolicyJson(
  policy = getChildSafetyPolicy()
): string {
  return JSON.stringify(
    {
      enabled: policy.enabled,
      semanticClassifierEnabled:
        policy.semanticClassifierEnabled,
      enabledCategories:
        policy.enabledCategories,
      customBlockedTerms:
        policy.customBlockedTerms,
      safeReply:
        policy.safeReply,
      teacherPasscode:
        policy.teacherPasscode,
    },
    null,
    2
  );
}


export function importChildSafetyPolicyJson(
  jsonText: string,
  existingPolicy = getChildSafetyPolicy()
): ChildSafetyPolicy {
  const parsed =
    JSON.parse(jsonText) as Partial<ChildSafetyPolicy>;

  return normalizePolicy({
    ...existingPolicy,
    ...parsed,
  });
}
