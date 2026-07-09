import {
  getUserProfiles,
} from "../profiles/userProfileStore";


export type FaceIdentityProfile = {
  id: string;
  userProfileId: string;
  displayName: string;
  descriptors: number[][];
  createdAt: string;
  updatedAt: string;
};

export type FaceIdentityMatch = {
  profile: FaceIdentityProfile;
  confidence: number;
  distance: number;
};

export const FACE_IDENTITY_PROFILES_CHANGED_EVENT =
  "xrp:face-identity-profiles-changed";

export const FACE_RECOGNITION_ENABLED_STORAGE_KEY =
  "xrp-emotion-system:face-recognition-enabled:v1";

export const FACE_IDENTITY_MIN_SAMPLES = 3;

const FACE_IDENTITY_STORAGE_KEY =
  "xrp-emotion-system:face-identities:v1";

const MAX_DESCRIPTORS_PER_PROFILE = 5;
const FACE_DESCRIPTOR_LENGTH = 128;
const MATCH_DISTANCE_THRESHOLD = 0.48;
const MATCH_SEPARATION_MARGIN = 0.08;

const BLOCKED_DISPLAY_NAMES = new Set([
  "i",
  "im",
  "me",
  "my",
  "mine",
  "the",
  "that",
  "this",
  "they",
  "them",
  "someone",
  "somebody",
  "person",
  "student",
  "user",
  "unknown",
  "really",
  "sad",
  "happy",
]);

function hasBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.localStorage)
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeRandomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `face-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function normalizeFaceIdentityDisplayName(
  value: string
): string | null {
  const clean = value
    .replace(/\s+/g, " ")
    .trim();

  if (
    clean.length < 2 ||
    clean.length > 40 ||
    !/^[\p{L}][\p{L}\p{M}' -]*$/u.test(clean)
  ) {
    return null;
  }

  const normalized = clean
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .trim();

  if (BLOCKED_DISPLAY_NAMES.has(normalized)) {
    return null;
  }

  return clean;
}

function isDescriptor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length ===
      FACE_DESCRIPTOR_LENGTH &&
    value.every(
      (item) =>
        typeof item === "number" &&
        Number.isFinite(item)
    )
  );
}

function sanitizeProfile(
  value: unknown
): FaceIdentityProfile | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const candidate =
    value as Partial<FaceIdentityProfile>;

  const displayName =
    normalizeFaceIdentityDisplayName(
      candidate.displayName ?? ""
    );

  const descriptors =
    Array.isArray(candidate.descriptors)
      ? candidate.descriptors
          .filter(isDescriptor)
          .slice(-MAX_DESCRIPTORS_PER_PROFILE)
      : [];

  if (
    !displayName ||
    typeof candidate.id !== "string" ||
    !candidate.id ||
    descriptors.length === 0
  ) {
    return null;
  }

  const linkedUserProfileId =
    typeof candidate.userProfileId ===
      "string" &&
    candidate.userProfileId
      ? candidate.userProfileId
      : getUserProfiles().find(
          (profile) =>
            profile.displayName.localeCompare(
              displayName,
              undefined,
              { sensitivity: "base" }
            ) === 0
        )?.id;

  if (!linkedUserProfileId) {
    return null;
  }

  const createdAt =
    typeof candidate.createdAt === "string"
      ? candidate.createdAt
      : nowIso();

  return {
    id: candidate.id,
    userProfileId:
      linkedUserProfileId,
    displayName,
    descriptors,
    createdAt,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : createdAt,
  };
}

function emitProfilesChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      FACE_IDENTITY_PROFILES_CHANGED_EVENT
    )
  );
}

function writeProfiles(
  profiles: FaceIdentityProfile[]
): void {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(
    FACE_IDENTITY_STORAGE_KEY,
    JSON.stringify(profiles)
  );

  emitProfilesChanged();
}

export function getFaceIdentityProfiles():
  FaceIdentityProfile[] {
  if (!hasBrowserStorage()) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        FACE_IDENTITY_STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(sanitizeProfile)
      .filter(
        (
          profile
        ): profile is FaceIdentityProfile =>
          profile !== null
      )
      .sort((a, b) =>
        a.displayName.localeCompare(
          b.displayName
        )
      );
  } catch {
    return [];
  }
}

export function saveFaceIdentityProfile(
  userProfileId: string,
  displayName: string,
  descriptor: number[]
): FaceIdentityProfile {
  const cleanName =
    normalizeFaceIdentityDisplayName(
      displayName
    );

  if (!cleanName) {
    throw new Error(
      "Enter a valid person's name."
    );
  }

  const cleanUserProfileId =
    userProfileId.trim();

  if (!cleanUserProfileId) {
    throw new Error(
      "Choose an existing chat profile."
    );
  }

  if (!isDescriptor(descriptor)) {
    throw new Error(
      "A valid face landmark sample is required."
    );
  }

  const profiles =
    getFaceIdentityProfiles();

  const existing =
    profiles.find(
      (profile) =>
        profile.userProfileId ===
        cleanUserProfileId
    );

  if (existing) {
    const updated: FaceIdentityProfile = {
      ...existing,
      userProfileId:
        cleanUserProfileId,
      displayName: cleanName,
      descriptors: [
        ...existing.descriptors,
        [...descriptor],
      ].slice(-MAX_DESCRIPTORS_PER_PROFILE),
      updatedAt: nowIso(),
    };

    writeProfiles(
      profiles.map((profile) =>
        profile.id === updated.id
          ? updated
          : profile
      )
    );

    return updated;
  }

  const createdAt = nowIso();
  const created: FaceIdentityProfile = {
    id: safeRandomId(),
    userProfileId:
      cleanUserProfileId,
    displayName: cleanName,
    descriptors: [[...descriptor]],
    createdAt,
    updatedAt: createdAt,
  };

  writeProfiles([
    ...profiles,
    created,
  ]);

  return created;
}

export function deleteFaceIdentityProfile(
  profileId: string
): void {
  writeProfiles(
    getFaceIdentityProfiles().filter(
      (profile) =>
        profile.id !== profileId
    )
  );
}

export function clearFaceIdentityProfiles():
  void {
  writeProfiles([]);
}

function descriptorDistance(
  left: number[],
  right: number[]
): number {
  if (
    left.length !== right.length ||
    left.length === 0
  ) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;

  for (let index = 0; index < left.length; index += 1) {
    const difference =
      left[index] - right[index];
    sum += difference * difference;
  }

  return Math.sqrt(sum);
}

export function findMatchingFaceIdentity(
  descriptor: number[],
  profiles: FaceIdentityProfile[] =
    getFaceIdentityProfiles()
): FaceIdentityMatch | null {
  if (!isDescriptor(descriptor)) {
    return null;
  }

  const candidates = profiles
    .filter(
      (profile) =>
        profile.descriptors.length >=
        FACE_IDENTITY_MIN_SAMPLES
    )
    .map((profile) => {
      const distances =
        profile.descriptors
          .map((sample) =>
            descriptorDistance(
              descriptor,
              sample
            )
          )
          .sort((a, b) => a - b);

      const bestDistances =
        distances.slice(
          0,
          Math.min(2, distances.length)
        );

      return {
        profile,
        distance:
          bestDistances.reduce(
            (sum, value) => sum + value,
            0
          ) / bestDistances.length,
      };
    })
    .sort(
      (a, b) =>
        a.distance - b.distance
    );

  const best = candidates[0];

  if (
    !best ||
    best.distance >
      MATCH_DISTANCE_THRESHOLD
  ) {
    return null;
  }

  const runnerUp = candidates[1];

  if (
    runnerUp &&
    runnerUp.distance - best.distance <
      MATCH_SEPARATION_MARGIN
  ) {
    return null;
  }

  return {
    profile: best.profile,
    distance: best.distance,
    confidence: Math.max(
      0.75,
      Math.min(
        0.99,
        1 -
          best.distance /
            (MATCH_DISTANCE_THRESHOLD * 4)
      )
    ),
  };
}
