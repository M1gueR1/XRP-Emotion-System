import { isPlausibleStudentName } from "./plausibleName";
import { validateProfileMemoryItem } from "./profileFactValidator";

export type UserProfileFact = {
  id: string;
  text: string;
  createdAt: string;
  source: "manual" | "chat" | "camera" | "system";
};


export type UserMemorySource =
  | "manual"
  | "chat"
  | "llm"
  | "camera"
  | "system";


export type UserMemoryKind =
  | "identity"
  | "preference"
  | "activity"
  | "study"
  | "work"
  | "role"
  | "skill"
  | "trait"
  | "emotional_trigger"
  | "note";


export type UserPreferencePolarity =
  | "like"
  | "love"
  | "prefer"
  | "dislike"
  | "hate";


export type UserMemoryEmotion =
  | "happy"
  | "sad"
  | "excited"
  | "upset"
  | "in_love";


export type UserMemoryItem = {
  id: string;
  kind: UserMemoryKind;
  field?: string;
  value?: string;
  target?: string;
  polarity?: UserPreferencePolarity;
  emotion?: UserMemoryEmotion;
  intensity: number;
  sourceText: string;
  source: UserMemorySource;
  createdAt: string;
  updatedAt: string;
};


export type UserProfile = {
  id: string;
  displayName: string;
  facts: UserProfileFact[];
  memoryItems: UserMemoryItem[];
  createdAt: string;
  updatedAt: string;
};


export type ParsedProfileText = {
  displayName?: string;
  clarification?: string;
  facts: string[];
  memoryItems: UserMemoryItem[];
  isQuestion: boolean;
  confidence: number;
};

export type ParseProfileTextOptions = {
  allowImplicitName?: boolean;
  knownDisplayName?: string;
};


const USER_PROFILES_STORAGE_KEY =
  "xrp-emotion-system:user-profiles:v1";

const ACTIVE_USER_PROFILE_STORAGE_KEY =
  "xrp-emotion-system:active-user-profile:v1";

let profileSanitizationNotice = "";

export const USER_PROFILE_CHANGED_EVENT =
  "xrp:user-profile-changed";


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


function normalizeText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


export function normalizeMemoryText(
  value: string
): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9ñ\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}


export function makeUserProfileId(
  displayName: string
): string {
  const normalized =
    normalizeText(displayName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return normalized || `user-${Date.now()}`;
}


function emitProfileChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      USER_PROFILE_CHANGED_EVENT
    )
  );
}


function upgradeProfile(
  profile: Partial<UserProfile>
): UserProfile {
  const createdAt =
    profile.createdAt ?? nowIso();

  return {
    id:
      profile.id ??
      makeUserProfileId(
        profile.displayName ?? "Student"
      ),

    displayName:
      profile.displayName ?? "Student",

    facts:
      Array.isArray(profile.facts)
        ? profile.facts
        : [],

    memoryItems:
      Array.isArray(profile.memoryItems)
        ? profile.memoryItems
        : [],

    createdAt,
    updatedAt:
      profile.updatedAt ?? createdAt,
  };
}


function sanitizeStoredProfile(
  profile: UserProfile
): { profile: UserProfile; changed: boolean } {
  if (
    profile.displayName ===
      LEGACY_INVALID_PROFILE_NAME ||
    isPlausibleProfileName(
      profile.displayName
    )
  ) {
    return {
      profile,
      changed: false,
    };
  }

  return {
    profile: {
      ...profile,
      displayName:
        LEGACY_INVALID_PROFILE_NAME,
      updatedAt: nowIso(),
    },
    changed: true,
  };
}


export function getProfileSanitizationNotice(): string {
  return profileSanitizationNotice;
}


function persistProfilesWithoutEvent(
  profiles: UserProfile[]
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    USER_PROFILES_STORAGE_KEY,
    JSON.stringify(profiles)
  );
}


function readProfilesFromStorage():
  UserProfile[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        USER_PROFILES_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw) as Partial<UserProfile>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    let changed = false;

    const profiles =
      parsed.map((profile) => {
        const sanitized =
          sanitizeStoredProfile(
            upgradeProfile(profile)
          );

        if (sanitized.changed) {
          profileSanitizationNotice =
            "A legacy profile contained an invalid student name. The name was removed while the remaining memories were preserved.";
        }

        changed =
          changed || sanitized.changed;

        return sanitized.profile;
      });

    if (changed) {
      persistProfilesWithoutEvent(
        profiles
      );
    }

    return profiles;
  } catch {
    return [];
  }
}


function writeProfilesToStorage(
  profiles: UserProfile[]
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    USER_PROFILES_STORAGE_KEY,
    JSON.stringify(profiles)
  );

  emitProfileChanged();
}


function uniqueFacts(
  facts: UserProfileFact[]
): UserProfileFact[] {
  const seen =
    new Set<string>();

  const result:
    UserProfileFact[] = [];

  for (const fact of facts) {
    const key =
      fact.text.trim().toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(fact);
  }

  return result;
}


function memoryDedupKey(
  memory: UserMemoryItem
): string {
  return [
    memory.kind,
    normalizeMemoryText(memory.field ?? ""),
    normalizeMemoryText(memory.value ?? ""),
    normalizeMemoryText(memory.target ?? ""),
    memory.polarity ?? "",
    memory.emotion ?? "",
  ].join("|");
}


function uniqueMemoryItems(
  items: UserMemoryItem[]
): UserMemoryItem[] {
  const map =
    new Map<string, UserMemoryItem>();

  for (const item of items) {
    const key =
      memoryDedupKey(item);

    const existing =
      map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    map.set(key, {
      ...existing,
      ...item,
      id: existing.id,
      createdAt:
        existing.createdAt,
      intensity:
        Math.max(
          existing.intensity,
          item.intensity
        ),
      updatedAt:
        nowIso(),
    });
  }

  return Array.from(
    map.values()
  );
}


export function getUserProfiles():
  UserProfile[] {
  return readProfilesFromStorage()
    .sort((a, b) =>
      a.displayName.localeCompare(
        b.displayName
      )
    );
}


export function getUserProfileById(
  profileId: string
): UserProfile | null {
  return (
    getUserProfiles().find(
      (profile) => profile.id === profileId
    ) ?? null
  );
}


export function getActiveUserProfileId():
  string | null {
  if (!hasBrowserStorage()) {
    return null;
  }

  return (
    window.localStorage.getItem(
      ACTIVE_USER_PROFILE_STORAGE_KEY
    ) || null
  );
}


export function setActiveUserProfileId(
  profileId: string | null
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  if (profileId) {
    window.localStorage.setItem(
      ACTIVE_USER_PROFILE_STORAGE_KEY,
      profileId
    );
  } else {
    window.localStorage.removeItem(
      ACTIVE_USER_PROFILE_STORAGE_KEY
    );
  }

  emitProfileChanged();
}


export function getActiveUserProfile():
  UserProfile | null {
  const activeId =
    getActiveUserProfileId();

  if (!activeId) {
    return null;
  }

  return getUserProfileById(
    activeId
  );
}


export function upsertUserProfile(
  displayName: string
): UserProfile {
  const cleanName =
    displayName.trim();

  if (!cleanName) {
    throw new Error(
      "Profile name is required."
    );
  }

  if (
    !isPlausibleProfileName(cleanName)
  ) {
    throw new Error(
      "Profile name is not valid."
    );
  }

  const profileId =
    makeUserProfileId(cleanName);

  const profiles =
    readProfilesFromStorage();

  const existing =
    profiles.find(
      (profile) => profile.id === profileId
    );

  if (existing) {
    const updated:
      UserProfile = {
        ...existing,
        displayName: cleanName,
        updatedAt: nowIso(),
      };

    writeProfilesToStorage(
      profiles.map((profile) =>
        profile.id === updated.id
          ? updated
          : profile
      )
    );

    return updated;
  }

  const createdAt =
    nowIso();

  const created:
    UserProfile = {
      id: profileId,
      displayName: cleanName,
      facts: [],
      memoryItems: [],
      createdAt,
      updatedAt: createdAt,
    };

  writeProfilesToStorage([
    ...profiles,
    created,
  ]);

  return created;
}


export function deleteUserProfile(
  profileId: string
): void {
  const profiles =
    readProfilesFromStorage();

  writeProfilesToStorage(
    profiles.filter(
      (profile) => profile.id !== profileId
    )
  );

  if (
    getActiveUserProfileId() ===
    profileId
  ) {
    setActiveUserProfileId(null);
  }
}


export function addFactsToUserProfile(
  profileId: string,
  factTexts: string[],
  source: UserProfileFact["source"] = "manual"
): UserProfile | null {
  const profiles =
    readProfilesFromStorage();

  const profile =
    profiles.find(
      (item) => item.id === profileId
    );

  if (!profile) {
    return null;
  }

  const newFacts:
    UserProfileFact[] =
    factTexts
      .map((factText) =>
        factText.trim()
      )
      .filter(Boolean)
      .map((factText) => ({
        id: safeRandomId(),
        text: factText,
        createdAt: nowIso(),
        source,
      }));

  const updated:
    UserProfile = {
      ...profile,
      facts: uniqueFacts([
        ...profile.facts,
        ...newFacts,
      ]),
      updatedAt: nowIso(),
    };

  writeProfilesToStorage(
    profiles.map((item) =>
      item.id === profileId
        ? updated
        : item
    )
  );

  return updated;
}


export function addMemoryItemsToUserProfile(
  profileId: string,
  memoryItems: UserMemoryItem[]
): UserProfile | null {
  const profiles =
    readProfilesFromStorage();

  const profile =
    profiles.find(
      (item) => item.id === profileId
    );

  if (!profile) {
    return null;
  }

  const acceptedMemoryItems = memoryItems.filter(
    (item) => validateProfileMemoryItem(item).accepted
  );

  const facts =
    acceptedMemoryItems
      .map((item) =>
        factFromMemoryItem(
          item,
          profile.displayName
        )
      )
      .filter(Boolean);

  const newFacts:
    UserProfileFact[] =
    facts.map((fact) => ({
      id: safeRandomId(),
      text: fact,
      createdAt: nowIso(),
      source: "chat",
    }));

  const updated:
    UserProfile = {
      ...profile,
      memoryItems:
        uniqueMemoryItems([
          ...profile.memoryItems,
          ...acceptedMemoryItems,
        ]),
      facts:
        uniqueFacts([
          ...profile.facts,
          ...newFacts,
        ]),
      updatedAt: nowIso(),
    };

  writeProfilesToStorage(
    profiles.map((item) =>
      item.id === profileId
        ? updated
        : item
    )
  );

  return updated;
}


export function removeFactFromUserProfile(
  profileId: string,
  factId: string
): UserProfile | null {
  const profiles =
    readProfilesFromStorage();

  const profile =
    profiles.find(
      (item) => item.id === profileId
    );

  if (!profile) {
    return null;
  }

  const updated:
    UserProfile = {
      ...profile,
      facts: profile.facts.filter(
        (fact) => fact.id !== factId
      ),
      updatedAt: nowIso(),
    };

  writeProfilesToStorage(
    profiles.map((item) =>
      item.id === profileId
        ? updated
        : item
    )
  );

  return updated;
}


function splitListValue(
  value: string
): string[] {
  return value
    .split(/,|\sy\s|\sand\s/gi)
    .map((item) => item.trim())
    .filter(Boolean);
}


function isLikelyQuestion(
  text: string
): boolean {
  const normalized =
    normalizeMemoryText(text);

  return (
    text.trim().endsWith("?") ||
    /^(who|what|when|where|why|how|do|does|did|am|are|can|could|should|would|will|que|qué|quien|quién|como|cómo)\b/i.test(
      normalized
    )
  );
}


const NAME_ALLOWED_REGEX =
  /^[A-ZÃÃ‰ÃÃ“ÃšÃ‘a-zÃ¡Ã©Ã­Ã³ÃºÃ±][A-ZÃÃ‰ÃÃ“ÃšÃ‘a-zÃ¡Ã©Ã­Ã³ÃºÃ±' -]{1,39}$/;


const LEGACY_INVALID_PROFILE_NAME =
  "Unnamed profile";


const EMOTIONAL_SELF_STATE_REGEX =
  /\b(?:i\s*'?m|im|i am|estoy|soy)\s+(?:really\s+|very\s+|so\s+|super\s+|just\s+|kinda\s+|kind of\s+)?(?:sad|happy|excited|upset|angry|mad|tired|stressed|worried|nervous|lonely|alone|fine|good|bad|ok|okay|furioso|triste|feliz|cansado|preocupado)\b/i;


export function isPlausibleProfileName(
  value: string
): boolean {
  // Kept for storage compatibility documentation; validation is centralized.
  void NAME_ALLOWED_REGEX;
  return isPlausibleStudentName(value);
}


function extractDisplayName(
  text: string,
  allowImplicitName: boolean
): string | undefined {
  const strongMatch =
    text.match(
      /\b(?:me llamo|mi nombre es|my name is|my names|my name's)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ'-]*)\b/i
    );

  const greetingMatch =
    text.match(
      /\b(?:hola\s+soy|hello\s+i\s*'?m|hey\s+i\s*'?m|hi\s+i\s*'?m)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ'-]*)\b/i
    );

  const callMeMatch =
    text.match(
      /\b(?:you can call me|please call me|call me)\s+([A-Za-z][A-Za-z' -]*)\b/i
    );

  /*
   * Bare "I'm X" is risky because:
   * "I'm really sad" must NOT create a user named "really".
   * So bare identity is ignored when the whole sentence looks like
   * a self emotional/state sentence.
   */
  const bareMatch =
    !allowImplicitName || EMOTIONAL_SELF_STATE_REGEX.test(text)
      ? null
      : text.match(
          /\b(?:soy|i\s*'?m|im|i am)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][A-ZÁÉÍÓÚÑa-záéíóúñ'-]*)\b/i
        );

  const candidate =
    strongMatch?.[1] ??
    greetingMatch?.[1] ??
    callMeMatch?.[1] ??
    bareMatch?.[1];

  if (!candidate) {
    return undefined;
  }

  const clean =
    candidate.trim();

  if (!isPlausibleProfileName(clean)) {
    return undefined;
  }

  return clean;
}


function clampIntensity(
  value: number
): number {
  return Math.min(
    1,
    Math.max(0.05, value)
  );
}


function intensityModifier(
  fullText: string,
  matchIndex: number
): number {
  const nearby =
    normalizeMemoryText(
      fullText.slice(
        Math.max(0, matchIndex - 24),
        matchIndex + 32
      )
    );

  let modifier = 0;

  if (
    /\b(really|very|so|super|mucho|muy|demasiado)\b/.test(
      nearby
    )
  ) {
    modifier += 0.14;
  }

  if (
    /\b(a little|un poco|kind of|kinda)\b/.test(
      nearby
    )
  ) {
    modifier -= 0.15;
  }

  return modifier;
}


function createMemoryItem(
  input: Omit<
    UserMemoryItem,
    "id" | "createdAt" | "updatedAt"
  >
): UserMemoryItem {
  const createdAt =
    nowIso();

  return {
    ...input,
    id: safeRandomId(),
    createdAt,
    updatedAt: createdAt,
  };
}


function cleanValue(
  value: string
): string {
  return value
    .replace(/^\s*(?:and|y)\s+/i, "")
    .replace(/\b(?:and|y)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}


function addIdentityMemory(
  items: UserMemoryItem[],
  field: string,
  value: string,
  sourceText: string
): void {
  const clean =
    cleanValue(value);

  if (!clean) {
    return;
  }

  items.push(
    createMemoryItem({
      kind: "identity",
      field,
      value: clean,
      intensity: 0.8,
      sourceText,
      source: "chat",
    })
  );
}


function addStudyMemory(
  items: UserMemoryItem[],
  value: string,
  sourceText: string
): void {
  const clean =
    cleanValue(value);

  if (!clean) {
    return;
  }

  items.push(
    createMemoryItem({
      kind: "study",
      field: "studies",
      value: clean,
      intensity: 0.75,
      sourceText,
      source: "chat",
    })
  );
}


function addWorkMemory(
  items: UserMemoryItem[],
  value: string,
  sourceText: string
): void {
  const clean =
    cleanValue(value);

  if (!clean) {
    return;
  }

  items.push(
    createMemoryItem({
      kind: "work",
      field: "occupation",
      value: clean,
      intensity: 0.75,
      sourceText,
      source: "chat",
    })
  );
}


function addStableProfileMemory(
  items: UserMemoryItem[],
  kind: "role" | "activity" | "skill" | "trait",
  field: string,
  value: string,
  sourceText: string
): void {
  const clean = cleanValue(value).replace(/^(?:a|an|the)\s+/i, "");

  if (!clean || clean.length > 100) {
    return;
  }

  items.push(createMemoryItem({
    kind,
    field,
    value: clean,
    target: kind === "activity" || kind === "skill" ? clean : undefined,
    intensity: 0.75,
    sourceText,
    source: "chat",
  }));
}


const OCCUPATION_ROLE_REGEX =
  /\b(?:engineer|developer|programmer|designer|teacher|doctor|nurse|artist|scientist|researcher|manager|technician|coach|lawyer|accountant|student intern|intern)\b/i;


function cleanOccupationValue(
  value: string
): string {
  return cleanValue(
    value.replace(/^(?:a|an|the)\s+/i, "")
  );
}


function isAmbiguousOccupationOrStudyValue(
  value: string
): boolean {
  const clean =
    cleanOccupationValue(value);

  return (
    /\b[a-z]+ing\b/i.test(clean) &&
    !OCCUPATION_ROLE_REGEX.test(clean)
  );
}


function ambiguousProfileClarification(
  text: string
): string | undefined {
  const match =
    text.match(
      /\b(?:i\s*'?m|im|i am)\s+(?:a|an)\s+([^.,;!?]+)/i
    );

  if (
    match?.[1] &&
    isAmbiguousOccupationOrStudyValue(
      match[1]
    )
  ) {
    return "Do you mean that you study that subject, or that it is your job?";
  }

  return undefined;
}


function addPreferenceMemory(
  items: UserMemoryItem[],
  target: string,
  polarity: UserPreferencePolarity,
  baseIntensity: number,
  sourceText: string,
  fullText: string,
  matchIndex: number
): void {
  const clean =
    cleanValue(target);

  if (!clean) {
    return;
  }

  items.push(
    createMemoryItem({
      kind: "preference",
      target: clean,
      polarity,
      intensity:
        clampIntensity(
          baseIntensity +
            intensityModifier(
              fullText,
              matchIndex
            )
        ),
      sourceText,
      source: "chat",
    })
  );
}


function addEmotionalTriggerMemory(
  items: UserMemoryItem[],
  target: string,
  emotion: UserMemoryEmotion,
  baseIntensity: number,
  sourceText: string,
  fullText: string,
  matchIndex: number
): void {
  const clean =
    cleanValue(target);

  if (!clean) {
    return;
  }

  items.push(
    createMemoryItem({
      kind: "emotional_trigger",
      target: clean,
      emotion,
      intensity:
        clampIntensity(
          baseIntensity +
            intensityModifier(
              fullText,
              matchIndex
            )
        ),
      sourceText,
      source: "chat",
    })
  );
}


function collectRegex(
  text: string,
  regex: RegExp,
  callback: (
    value: string,
    matchIndex: number,
    matchedText: string
  ) => void
): void {
  for (
    let match = regex.exec(text);
    match;
    match = regex.exec(text)
  ) {
    callback(
      match[1] ?? "",
      match.index,
      match[0] ?? ""
    );
  }
}


function addPreferenceList(
  items: UserMemoryItem[],
  value: string,
  polarity: UserPreferencePolarity,
  baseIntensity: number,
  sourceText: string,
  fullText: string,
  matchIndex: number
): void {
  for (
    const item of splitListValue(value)
  ) {
    if (
      /\b(?:rather than|instead of|over|more than|mas que|más que|en vez de)\b/i.test(
        item
      )
    ) {
      continue;
    }

    addPreferenceMemory(
      items,
      item,
      polarity,
      baseIntensity,
      sourceText,
      fullText,
      matchIndex
    );
  }
}


function addComparisonPreferenceMemory(
  items: UserMemoryItem[],
  preferredTarget: string,
  comparedTarget: string,
  sourceText: string,
  fullText: string,
  matchIndex: number
): void {
  addPreferenceMemory(
    items,
    preferredTarget,
    "prefer",
    0.72,
    sourceText,
    fullText,
    matchIndex
  );

  addPreferenceMemory(
    items,
    comparedTarget,
    "dislike",
    0.58,
    sourceText,
    fullText,
    matchIndex
  );
}


function collectComparisonPreferences(
  items: UserMemoryItem[],
  normalized: string
): void {
  const comparisonRegex =
    /\b(?:i\s+(?:really\s+|very\s+|so\s+|super\s+)?(?:like|prefer|love)|me\s+(?:gusta|encanta)|prefiero)\s+([^.,;]+?)\s+(?:rather than|instead of|over|more than|mas que|más que|en vez de)\s+([^.,;]+)/gi;

  for (
    let match = comparisonRegex.exec(normalized);
    match;
    match = comparisonRegex.exec(normalized)
  ) {
    addComparisonPreferenceMemory(
      items,
      match[1] ?? "",
      match[2] ?? "",
      match[0] ?? "",
      normalized,
      match.index
    );
  }
}


function cleanSpecificityTarget(
  value: string
): string {
  return cleanValue(
    value
      .replace(/^\s*(?:i\s+like|i\s+love|i\s+prefer|me\s+gusta|me\s+encanta)\s+/i, "")
      .replace(/^\s*(?:more\s+)?specifically\s+/i, "")
      .replace(/^\s*(?:especially|mainly|mostly)\s+/i, "")
  );
}


function collectSpecificPreferenceDetails(
  items: UserMemoryItem[],
  normalized: string
): void {
  const specificityRegex =
    /\b(?:more specifically|specifically|especially|mainly|mostly)\s+([^.,;]+)/gi;

  for (
    let match = specificityRegex.exec(normalized);
    match;
    match = specificityRegex.exec(normalized)
  ) {
    const target =
      cleanSpecificityTarget(
        match[1] ?? ""
      );

    if (!target) {
      continue;
    }

    addPreferenceMemory(
      items,
      target,
      "like",
      0.74,
      match[0] ?? "",
      normalized,
      match.index
    );
  }
}


function cleanPreferenceItem(
  value: string
): string {
  return cleanValue(
    value
      .replace(/^\s*(?:to\s+)?(?:eat|play|watch|read|listen to|do|make|study)\s+/i, "")
      .replace(/^\s*(?:playing|watching|eating|reading|doing|making|studying)\s+/i, "")
      .replace(/^\s*(?:more\s+)?specifically\s+/i, "")
      .replace(/^\s*(?:especially|mainly|mostly)\s+/i, "")
      .replace(/\s+/g, " ")
  );
}


function splitPreferenceSeries(
  value: string
): string[] {
  /*
   * Handles phrases like:
   * "mario kart, videogames and to eat hamburgers and pizza"
   * -> mario kart / videogames / hamburgers / pizza
   */
  const normalizedValue =
    value
      .replace(/\b(?:and|y)\s+to\s+(?:eat|play|watch|read|listen to|do|make|study)\s+/gi, ", ")
      .replace(/\b(?:and|y)\s+(?:playing|watching|eating|reading|doing|making|studying)\s+/gi, ", ")
      .replace(/\b(?:more\s+)?specifically\s+/gi, ", ")
      .replace(/\b(?:especially|mainly|mostly)\s+/gi, ", ");

  return normalizedValue
    .split(/,|\s+and\s+|\s+y\s+/gi)
    .map(cleanPreferenceItem)
    .filter(
      (item) =>
        item.length > 0 &&
        !/^(and|y|to|eat|play|watch|read|do|make)$/i.test(
          item
        )
    );
}


function collectExpandedPreferenceLists(
  items: UserMemoryItem[],
  normalized: string
): void {
  const preferenceListRegex =
    /\b(?:i\s+(really\s+|very\s+|so\s+|super\s+)?(like|love|prefer)|me\s+(gusta|encanta)|prefiero)\s+([^.;!?]+)/gi;

  for (
    let match = preferenceListRegex.exec(normalized);
    match;
    match = preferenceListRegex.exec(normalized)
  ) {
    const intensityWord =
      match[1] ?? "";

    const verb =
      (match[2] ?? match[3] ?? "like").toLowerCase();

    const rawList =
      match[4] ?? "";

    const isLove =
      verb.includes("love") ||
      verb.includes("encanta");

    const isPrefer =
      verb.includes("prefer") ||
      verb.includes("prefiero");

    const polarity:
      UserPreferencePolarity =
      isLove
        ? "love"
        : isPrefer
          ? "prefer"
          : "like";

    const baseIntensity =
      isLove
        ? 0.82
        : isPrefer
          ? 0.70
          : 0.58;

    const boostedBaseIntensity =
      /\b(really|very|so|super)\b/i.test(
        intensityWord
      )
        ? Math.min(0.95, baseIntensity + 0.14)
        : baseIntensity;

    for (
      const item of splitPreferenceSeries(rawList)
    ) {
      addPreferenceMemory(
        items,
        item,
        polarity,
        boostedBaseIntensity,
        match[0] ?? "",
        normalized,
        match.index
      );
    }
  }
}


function factSubject(
  displayName: string
): string {
  return displayName || "User";
}


export function factFromMemoryItem(
  item: UserMemoryItem,
  displayName: string
): string {
  const subject =
    factSubject(displayName);

  if (
    item.kind === "identity" &&
    item.field === "origin" &&
    item.value
  ) {
    return `${subject} is from ${item.value}`;
  }

  if (
    item.kind === "identity" &&
    item.field === "age" &&
    item.value
  ) {
    return `${subject} is ${item.value} years old`;
  }

  if (
    item.kind === "identity" &&
    item.field === "pets" &&
    item.value
  ) {
    return `${subject} has ${item.value}`;
  }

  if (
    item.kind === "identity" &&
    item.field &&
    item.value
  ) {
    return `${subject}'s ${item.field.replace(/_/g, " ")} is ${item.value}`;
  }

  if (
    item.kind === "study" &&
    item.value
  ) {
    return `${subject} studies ${item.value}`;
  }

  if (
    item.kind === "work" &&
    item.value
  ) {
    return `${subject} works as ${item.value}`;
  }

  if (item.kind === "role" && item.value) {
    return `${subject} is a ${item.value}`;
  }

  if (item.kind === "skill" && item.value) {
    return `${subject} is learning or skilled at ${item.value}`;
  }

  if (item.kind === "trait" && item.value) {
    return `${subject} describes themselves as ${item.value}`;
  }

  if (
    item.kind === "preference" &&
    item.target &&
    item.polarity
  ) {
    if (
      item.polarity === "dislike" ||
      item.polarity === "hate"
    ) {
      return `${subject} does not like ${item.target}`;
    }

    if (item.polarity === "prefer") {
      return `${subject} prefers ${item.target}`;
    }

    if (item.polarity === "love") {
      return `${subject} loves ${item.target}`;
    }

    return `${subject} likes ${item.target}`;
  }

  if (
    item.kind === "activity" &&
    item.target
  ) {
    return `${subject} likes doing ${item.target}`;
  }

  if (
    item.kind === "emotional_trigger" &&
    item.target &&
    item.emotion
  ) {
    return `${item.target} makes ${subject} ${item.emotion.replace("_", " ")}`;
  }

  return (
    item.value ??
    item.target ??
    item.sourceText
  );
}


export function parseProfileText(
  text: string,
  options: ParseProfileTextOptions = {}
): ParsedProfileText {
  const memoryItems:
    UserMemoryItem[] = [];

  const isQuestion =
    isLikelyQuestion(text);

  const displayName =
    isQuestion
      ? undefined
      : extractDisplayName(
          text,
          options.allowImplicitName ??
            !options.knownDisplayName
        );

  if (isQuestion) {
    return {
      displayName,
      facts: [],
      memoryItems: [],
      isQuestion,
      confidence: 0.92,
    };
  }

  const normalized =
    text.replace(/\s+/g, " ").trim();

  const clarification =
    ambiguousProfileClarification(
      normalized
    );

  collectRegex(
    normalized,
    /\b(?:i\s*'?m|im|i am|tengo)\s+(\d{1,2})\s+(?:years old|year old|yo|años|anos)\b/gi,
    (value, _index, matched) =>
      addIdentityMemory(
        memoryItems,
        "age",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:i have|ive got|i've got|tengo)\s+(\d+)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)\b/gi,
    (value, _index, matched) => {
      const petMatch =
        matched.match(
          /\b(?:i have|ive got|i've got|tengo)\s+(\d+)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]+)\b/i
        );

      const amount =
        petMatch?.[1] ?? value;

      const noun =
        petMatch?.[2] ?? "";

      const cleanNoun =
        cleanValue(noun);

      if (
        /^(dog|dogs|cat|cats|pet|pets|perro|perros|gato|gatos)$/i.test(
          cleanNoun
        )
      ) {
        addIdentityMemory(
          memoryItems,
          "pets",
          `${amount} ${cleanNoun}`,
          matched
        );
      }
    }
  );

  collectRegex(
    normalized,
    /\b(?:soy de|vivo en|i am from|i'm from|im from|i live in|i moved from|i come from|i was born in)\s+([^.,;]+)/gi,
    (value, _index, matched) =>
      addIdentityMemory(
        memoryItems,
        "origin",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:estudio|estoy estudiando|i study|i am studying|i'm studying|im studying)\s+([^.,;]+)/gi,
    (value, _index, matched) =>
      addStudyMemory(
        memoryItems,
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:trabajo en|i work on|i work in|i work at|i work as|i am working on|i'm working on|im working on)\s+([^.,;]+)/gi,
    (value, _index, matched) =>
      addWorkMemory(
        memoryItems,
        cleanOccupationValue(value),
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:i\s*'?m|im|i am)\s+(a|an|the)\s+([^.,;]+)/gi,
    (_value, _index, matched) => {
      const match =
        matched.match(
          /\b(?:i\s*'?m|im|i am)\s+(?:a|an|the)\s+([^.,;]+)/i
        );

      const occupation =
        cleanOccupationValue(
          match?.[1] ?? ""
        );

      if (
        occupation &&
        !isAmbiguousOccupationOrStudyValue(
          occupation
        ) &&
        OCCUPATION_ROLE_REGEX.test(
          occupation
        ) &&
        !/^student$/i.test(occupation)
      ) {
        addWorkMemory(
          memoryItems,
          occupation,
          matched
        );
      }
    }
  );

  collectRegex(
    normalized,
    /\b(?:i\s*'?m|im|i am)\s+(?:a|an|the)\s+((?:soccer|football|basketball|baseball|tennis|volleyball)?\s*player|team captain|captain|volunteer|club member|mentor)\b/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "role",
        "role",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b([^.,;!?]{2,60}?)\s+is\s+my\s+job\b/gi,
    (value, _index, matched) =>
      addWorkMemory(
        memoryItems,
        value.toLowerCase() === "soccer" ? "soccer player" : value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:i play|i practice|i participate in|i take part in)\s+([^.,;!?]+)/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "activity",
        "activity",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:i\s*'?m good at|im good at|i am good at)\s+([^.,;!?]+)/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "skill",
        "skill",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\bi know how to program in\s+([A-Za-z0-9+#.-]{1,30})\b/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "skill",
        "skill",
        `${value} programming`,
        matched
      )
  );

  collectRegex(
    normalized,
    /\bi can play (?:the )?([^.,;!?]+)/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "skill",
        "skill",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:i\s*'?m|im|i am)\s+(?:a\s+)?(organized|patient|creative|kind|curious|responsible|helpful|hardworking)(?:\s+person)?\b/gi,
    (value, _index, matched) =>
      addStableProfileMemory(
        memoryItems,
        "trait",
        "trait",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:mi deporte favorito es|my favorite sport is)\s+([^.,;]+)/gi,
    (value, _index, matched) =>
      addIdentityMemory(
        memoryItems,
        "favorite_sport",
        value,
        matched
      )
  );

  collectRegex(
    normalized,
    /\b(?:mi comida favorita es|my favorite food is|my favorite dessert is|mi postre favorito es)\s+([^.,;]+)/gi,
    (value, _index, matched) =>
      addIdentityMemory(
        memoryItems,
        "favorite_food",
        value,
        matched
      )
  );

  collectExpandedPreferenceLists(
    memoryItems,
    normalized
  );

  collectComparisonPreferences(
    memoryItems,
    normalized
  );

  collectSpecificPreferenceDetails(
    memoryItems,
    normalized
  );

  collectRegex(
    normalized,
    /\b(?:me gusta|me gustan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?like)\s+([^.,;]+?)(?=\s+(?:y\s+|and\s+)?(?:me gusta|me gustan|me encanta|me encantan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?like|i\s+(?:really\s+|very\s+|so\s+|super\s+)?love|i enjoy|i prefer|odio|detesto|no me gusta|no me gustan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?hate|i dislike|i don't like|i do not like)|[.,;]|$)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "like",
        0.56,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:me encanta|me encantan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?love)\s+([^.,;]+?)(?=\s+(?:y\s+|and\s+)?(?:me gusta|me gustan|me encanta|me encantan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?like|i\s+(?:really\s+|very\s+|so\s+|super\s+)?love|i enjoy|i prefer|odio|detesto|no me gusta|no me gustan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?hate|i dislike|i don't like|i do not like)|[.,;]|$)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "love",
        0.82,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:i enjoy|me divierte|disfruto)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "like",
        0.64,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:i prefer|prefiero|me gusta mas|me gusta más)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "prefer",
        0.68,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:no me gusta|no me gustan|i dislike|i don't like|i do not like)\s+([^.,;]+?)(?=\s+(?:y\s+|and\s+)?(?:me gusta|me gustan|me encanta|me encantan|i like|i love|i enjoy|i prefer|odio|detesto|no me gusta|no me gustan|i hate|i dislike|i don't like|i do not like)|[.,;]|$)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "dislike",
        0.66,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:odio|detesto|i\s+(?:really\s+|very\s+|so\s+|super\s+)?hate)\s+([^.,;]+?)(?=\s+(?:y\s+|and\s+)?(?:me gusta|me gustan|me encanta|me encantan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?like|i\s+(?:really\s+|very\s+|so\s+|super\s+)?love|i enjoy|i prefer|odio|detesto|no me gusta|no me gustan|i\s+(?:really\s+|very\s+|so\s+|super\s+)?hate|i dislike|i don't like|i do not like)|[.,;]|$)/gi,
    (value, index, matched) =>
      addPreferenceList(
        memoryItems,
        value,
        "hate",
        0.84,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:me gusta hacer|me gusta jugar|i like playing|i like doing|i enjoy playing|i enjoy doing)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      memoryItems.push(
        createMemoryItem({
          kind: "activity",
          target: cleanValue(value),
          intensity:
            clampIntensity(
              0.68 +
                intensityModifier(
                  normalized,
                  index
                )
            ),
          sourceText: matched,
          source: "chat",
        })
      )
  );

  collectRegex(
    normalized,
    /\b(?:me pone feliz|me alegra|makes me happy|makes me feel happy|i get happy when)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "happy",
        0.76,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /(?:^|[.,;]\s*)([^.,;]{2,70}?)\s+(?:makes me happy|makes me feel happy)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "happy",
        0.76,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:me pone triste|me entristece|makes me sad|makes me feel sad|i get sad when|me da tristeza cuando)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "sad",
        0.80,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /(?:^|[.,;]\s*)([^.,;]{2,70}?)\s+(?:makes me sad|makes me feel sad)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "sad",
        0.80,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:me emociona|makes me excited|i get excited when)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "excited",
        0.80,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /(?:^|[.,;]\s*)([^.,;]{2,70}?)\s+(?:makes me excited)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "excited",
        0.80,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /\b(?:me molesta|me frustra|makes me upset|makes me angry|i get upset when)\s+([^.,;]+)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "upset",
        0.78,
        matched,
        normalized,
        index
      )
  );

  collectRegex(
    normalized,
    /(?:^|[.,;]\s*)([^.,;]{2,70}?)\s+(?:makes me upset|makes me angry)/gi,
    (value, index, matched) =>
      addEmotionalTriggerMemory(
        memoryItems,
        value,
        "upset",
        0.78,
        matched,
        normalized,
        index
      )
  );

  const facts =
    uniqueMemoryItems(memoryItems)
      .map((item) =>
        factFromMemoryItem(
          item,
          displayName ?? "User"
        )
      );

  return {
    displayName,
    clarification,
    facts,
    memoryItems:
      uniqueMemoryItems(memoryItems),
    isQuestion,
    confidence:
      memoryItems.length > 0 ||
      displayName ||
      clarification
        ? 0.82
        : 0.35,
  };
}


export function learnFromProfileText(
  text: string,
  fallbackProfileId?: string,
  options: ParseProfileTextOptions = {}
): UserProfile | null {
  const parsed =
    parseProfileText(text, options);

  if (parsed.isQuestion) {
    return (
      fallbackProfileId
        ? getUserProfileById(
            fallbackProfileId
          )
        : getActiveUserProfile()
    );
  }

  let profile:
    UserProfile | null = null;

  if (parsed.displayName) {
    profile =
      upsertUserProfile(
        parsed.displayName
      );
  } else if (fallbackProfileId) {
    profile =
      getUserProfileById(
        fallbackProfileId
      );
  } else {
    profile =
      getActiveUserProfile();
  }

  if (!profile) {
    return null;
  }

  if (parsed.memoryItems.length > 0) {
    return addMemoryItemsToUserProfile(
      profile.id,
      parsed.memoryItems
    );
  }

  return profile;
}


export function summarizeUserProfile(
  profile: UserProfile
): string {
  if (
    profile.memoryItems.length === 0 &&
    profile.facts.length === 0
  ) {
    return `${profile.displayName} has no saved facts yet.`;
  }

  const facts =
    profile.memoryItems.length > 0
      ? profile.memoryItems.map((item) =>
          factFromMemoryItem(
            item,
            profile.displayName
          )
        )
      : profile.facts.map(
          (fact) => fact.text
        );

  return `${profile.displayName}: ${facts.join("; ")}`;
}
