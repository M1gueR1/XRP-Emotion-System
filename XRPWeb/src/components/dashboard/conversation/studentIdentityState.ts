import { cleanStudentName, isPlausibleStudentName } from "../profiles/plausibleName";
import type { UserProfile } from "../profiles/userProfileStore";
import type { StudentIdentityState } from "./studentCompanionTypes";

export function identityStateForProfile(profile: UserProfile | null): StudentIdentityState {
  return profile && isPlausibleStudentName(profile.displayName)
    ? "known_student"
    : "unknown_student";
}

const ONBOARDING_GREETING_TEMPLATES = [
  "Hi! I'm {robotName}. What's your name?",
  "Hello there! I'm {robotName} - what should I call you?",
  "Hey! My name is {robotName}. And you, what's yours?",
  "Hi, I'm {robotName}! Nice to meet you. What's your name?",
  "Hello! {robotName} here. Mind telling me your name?",
  "Hey there! I go by {robotName}. What's your name?",
  "Hi! {robotName} at your service. What can I call you?",
  "Hello, friend! I'm {robotName}. What's your name?",
  "Hey, I'm {robotName}! What should I call you?",
  "Hi! It's {robotName}. Who do I have the pleasure of talking to?",
  "Hello! I'm {robotName}, your robot friend. What's your name?",
  "Hey! {robotName} here, ready to chat. What's your name?",
  "Hi there! I'm {robotName}. Care to share your name?",
  "Hello! My name's {robotName}. What's yours?",
  "Hey! I'm {robotName} - nice to meet you. What's your name?",
  "Hi! {robotName} here. Let's get acquainted - what's your name?",
  "Hello! I'm {robotName}, happy to meet you. What should I call you?",
  "Hey there! {robotName}'s the name. What's yours?",
  "Hi! I'm {robotName}. Before we start, what's your name?",
  "Hello! {robotName} reporting for duty. What's your name?",
  "Hey! I'm {robotName}, your new robot buddy. What's your name?",
  "Hi there, I'm {robotName}! So, what's your name?",
  "Hello! I'm {robotName}. I'd love to know your name.",
  "Hey! {robotName} checking in. What's your name?",
];

const NAME_CONFIRMATION_TEMPLATES = [
  "So, should I call you {studentName}?",
  "Got it - your name is {studentName}, right?",
  "So your name's {studentName}?",
  "Alright, {studentName} it is?",
  "Just to confirm, you're {studentName}?",
  "So I should call you {studentName}, correct?",
  "Nice, so it's {studentName}?",
  "Okay, {studentName} - did I get that right?",
  "So your name is {studentName}, yes?",
  "Alright then, {studentName} - is that right?",
  "So, {studentName}, is that correct?",
  "Let me make sure - you're {studentName}?",
  "So it's {studentName}, am I right?",
  "Okay so, {studentName} - did I hear that correctly?",
  "So I'll call you {studentName} then?",
  "Got it, {studentName} - that's your name?",
  "So, {studentName} - is that how you go by?",
  "Alright, so your name is {studentName}?",
  "Just checking - {studentName}, right?",
  "So then, you're {studentName}?",
  "Okay, so should I go with {studentName}?",
  "So, {studentName} it is, correct?",
  "Let me confirm - {studentName}, right?",
  "So that's {studentName}, then?",
];

function pickTemplate(templates: string[], random: () => number): string {
  const index = Math.min(
    templates.length - 1,
    Math.max(0, Math.floor(random() * templates.length))
  );
  return templates[index];
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(value),
    template
  );
}

function normalizeConfirmationText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function onboardingGreeting(robotName: string, random = Math.random): string {
  return fillTemplate(
    pickTemplate(ONBOARDING_GREETING_TEMPLATES, random),
    { robotName: robotName || "the XRP robot" }
  );
}

export function nameConfirmationPrompt(studentName: string, random = Math.random): string {
  return fillTemplate(
    pickTemplate(NAME_CONFIRMATION_TEMPLATES, random),
    { studentName }
  );
}

export function isAffirmativeNameConfirmation(text: string): boolean {
  const normalized = normalizeConfirmationText(text);
  return /^(yes|yeah|yep|yup|correct|right|thats right|that is right|sure|sure yes|ok|okay|okay yes|please|yes please|si|claro)$/.test(normalized);
}

export function isNegativeNameConfirmation(text: string): boolean {
  const normalized = normalizeConfirmationText(text);
  return /^(no|nope|nah|not|not right|incorrect|wrong|thats wrong|that is wrong|no thanks|cancel|try again|change it|dont|do not)$/.test(normalized) ||
    /\b(not my name|wrong name|dont call me|do not call me)\b/.test(normalized);
}

export type NameCandidateResult = {
  candidate?: string;
  explicit: boolean;
  requiresConfirmation: boolean;
};

export function extractContextualNameCandidate(
  text: string,
  identityState: StudentIdentityState,
  existingName?: string
): NameCandidateResult {
  const clean = text.replace(/\s+/g, " ").trim();
  const explicitMatch = clean.match(
    /\b(?:my name is|you can call me|please call me|i want you to call me|i want to change my name to)\s+([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f' -]{0,39}?)(?=\s+(?:and|but|because|instead)\b|[,.!?]?$)/i
  );
  const greetingMatch = clean.match(
    /^(?:hi|hello|hey)[,!]?\s+(?:i\s*'?m|i am)\s+([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f' -]{0,39}?)(?=\s+(?:and|but|because)\b|[,.!?]?$)/i
  );
  const implicitMatch = clean.match(
    /^(?:i\s*'?m|i am)\s+([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f' -]{0,39}?)(?=\s+(?:and|but|because)\b|[,.!?]?$)/i
  );
  const shortAnswer = identityState === "awaiting_name"
    ? clean.match(/^([A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f' -]{0,39})[.!?]?$/)
    : null;
  const rawCandidate = explicitMatch?.[1] ??
    greetingMatch?.[1] ??
    ((identityState === "unknown_student" || identityState === "awaiting_name") ? implicitMatch?.[1] : undefined) ??
    shortAnswer?.[1];
  const candidate = rawCandidate ? cleanStudentName(rawCandidate) ?? undefined : undefined;
  const explicit = Boolean(explicitMatch || greetingMatch);

  return {
    candidate,
    explicit,
    requiresConfirmation: Boolean(
      candidate &&
      explicit &&
      (
        !existingName ||
        candidate.toLowerCase() !== existingName.toLowerCase()
      )
    ),
  };
}
