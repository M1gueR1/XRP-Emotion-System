import type { CandidateProfileFact, ProfileFactField } from "../conversation/studentCompanionTypes";
import { isPlausibleStudentName } from "./plausibleName";
import type { UserMemoryItem, UserMemoryKind } from "./userProfileStore";

const TEMPORARY_STATES = /^(?:sad|happy|tired|nervous|worried|hungry|frustrated|angry|upset|lonely|sick|fine|good|bad)(?: today| right now)?$/i;
const INVALID_FRAGMENT = /^(?:a|an|the|from|studying|feeling|working|learning|called)$/i;

export type ProfileUpdateValidation = {
  accepted: boolean;
  reason: string;
};

function itemValue(item: UserMemoryItem): string {
  return (item.value ?? item.target ?? "").replace(/\s+/g, " ").trim();
}

/** The single validation gate used before any profile-memory write. */
export function validateProfileMemoryItem(item: UserMemoryItem): ProfileUpdateValidation {
  const value = itemValue(item);
  if (!value || value.length > 120 || INVALID_FRAGMENT.test(value)) {
    return { accepted: false, reason: "The proposed profile value is empty, incomplete, or too long." };
  }
  if (item.kind === "trait" && TEMPORARY_STATES.test(value)) {
    return { accepted: false, reason: "Temporary emotional or physical states are not permanent traits." };
  }
  if (item.kind === "identity" && item.field === "name" && !isPlausibleStudentName(value)) {
    return { accepted: false, reason: "The proposed name did not pass the plausible-name validator." };
  }
  if (item.kind === "study" && /^(?:a|an|the)?\s*$/i.test(value)) {
    return { accepted: false, reason: "The study field is incomplete." };
  }
  return { accepted: true, reason: "The profile update passed deterministic validation." };
}

export function validateCandidateProfileFact(candidate: CandidateProfileFact): ProfileUpdateValidation {
  const value = candidate.value.replace(/\s+/g, " ").trim();
  if (candidate.confidence < 0.72) {
    return { accepted: false, reason: "The model candidate confidence was too low." };
  }
  if (candidate.evidence !== "explicit") {
    return { accepted: false, reason: "Only explicitly stated student facts may be stored." };
  }
  if (candidate.field === "name" && !isPlausibleStudentName(value)) {
    return { accepted: false, reason: "The model-proposed name was not plausible." };
  }
  if (!value || value.length > 120 || INVALID_FRAGMENT.test(value)) {
    return { accepted: false, reason: "The model-proposed value was incomplete or too long." };
  }
  if (candidate.field === "trait" && TEMPORARY_STATES.test(value)) {
    return { accepted: false, reason: "A temporary state cannot be stored as a stable trait." };
  }
  return { accepted: true, reason: "The explicit candidate passed deterministic validation." };
}

export function profileFieldToMemoryKind(field: ProfileFactField): UserMemoryKind {
  switch (field) {
    case "studies": return "study";
    case "occupation": return "work";
    case "role": return "role";
    case "activity": return "activity";
    case "skill": return "skill";
    case "trait": return "trait";
    case "like":
    case "dislike": return "preference";
    default: return "identity";
  }
}
