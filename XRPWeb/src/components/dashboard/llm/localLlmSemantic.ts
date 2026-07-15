import type {
  CandidateProfileFact,
  CompanionRobotEmotion,
  LocalSemanticAnalysis,
  ProfileFactField,
  ResponseCategory,
  StudentEmotion,
  StudentIntent,
} from "../conversation/studentCompanionTypes";
import { isPlausibleStudentName } from "../profiles/plausibleName";
import type { LocalLlmMessage } from "./localLlmTypes";
import type { LocalLlmProfileFields, LocalLlmPromptMessage } from "./localLlmPrompt";

const INTENTS = new Set<StudentIntent>(["greeting", "wellbeing_question", "robot_identity_question", "self_introduction", "profile_statement", "preference_statement", "memory_question", "emotional_disclosure", "general_question", "farewell", "clarification_answer", "unknown"]);
const STUDENT_EMOTIONS = new Set<StudentEmotion>(["neutral", "happy", "excited", "sad", "worried", "frustrated", "angry", "lonely", "confused"]);
const PROFILE_FIELDS = new Set<ProfileFactField>(["name", "studies", "occupation", "origin", "age", "like", "dislike", "role", "activity", "skill", "trait"]);
const RESPONSE_CATEGORIES = new Set<ResponseCategory>(["greeting", "wellbeing", "robot_identity", "profile_acknowledgement", "preference_acknowledgement", "memory_answer", "empathetic_sad", "empathetic_worried", "empathetic_frustrated", "empathetic_lonely", "celebratory", "encouragement", "clarification", "farewell", "general_conversation", "safe_fallback"]);
const ROBOT_EMOTIONS = new Set<CompanionRobotEmotion>(["idle", "happy", "sad", "upset", "excited", "puzzled", "in_love"]);

const clamp = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const clean = (value: unknown, limit = 160) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";

function finalJsonObject(text: string): unknown {
  const candidates: string[] = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "{") { if (depth === 0) start = i; depth += 1; }
    else if (char === "}" && depth > 0) { depth -= 1; if (depth === 0 && start >= 0) candidates.push(text.slice(start, i + 1)); }
  }
  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(candidates[i]); } catch { /* try the previous object */ }
  }
  throw new Error("The local semantic model did not return valid JSON.");
}

export function parseLocalSemanticOutput(text: string): LocalSemanticAnalysis {
  const raw = finalJsonObject(text);
  if (!raw || typeof raw !== "object") throw new Error("Invalid semantic analysis object.");
  const value = raw as Record<string, unknown>;
  const intent = INTENTS.has(value.intent as StudentIntent) ? value.intent as StudentIntent : "unknown";
  const studentEmotion = STUDENT_EMOTIONS.has(value.studentEmotion as StudentEmotion) ? value.studentEmotion as StudentEmotion : "neutral";
  const responseCategory = RESPONSE_CATEGORIES.has(value.responseCategory as ResponseCategory) ? value.responseCategory as ResponseCategory : "safe_fallback";
  const robotEmotion = ROBOT_EMOTIONS.has(value.robotEmotion as CompanionRobotEmotion) ? value.robotEmotion as CompanionRobotEmotion : "idle";
  const candidateProfileFacts = Array.isArray(value.candidateProfileFacts)
    ? value.candidateProfileFacts.map((candidate): CandidateProfileFact | null => {
        if (!candidate || typeof candidate !== "object") return null;
        const item = candidate as Record<string, unknown>;
        const field = item.field as ProfileFactField;
        const factValue = clean(item.value, 120);
        const evidence = item.evidence === "explicit" ? "explicit" : item.evidence === "inferred" ? "inferred" : null;
        if (!PROFILE_FIELDS.has(field) || !factValue || !evidence || (field === "name" && !isPlausibleStudentName(factValue))) return null;
        return { field, value: factValue, confidence: clamp(item.confidence), evidence };
      }).filter((item): item is CandidateProfileFact => item !== null)
    : [];

  return {
    intent,
    studentEmotion,
    emotionConfidence: clamp(value.emotionConfidence),
    candidateProfileFacts,
    needsClarification: value.needsClarification === true,
    clarificationQuestion: clean(value.clarificationQuestion) || undefined,
    responseCategory,
    suggestedReply: clean(value.suggestedReply, 240) || undefined,
    robotEmotion,
    confidence: clamp(value.confidence),
  };
}

function list(values?: string[]): string {
  return values?.length ? values.slice(0, 8).map((value) => clean(value, 80)).join(", ") : "Unknown";
}

export function buildLocalSemanticMessages(input: {
  profileFields?: LocalLlmProfileFields;
  recentMessages: LocalLlmPromptMessage[];
  studentMessage: string;
}): LocalLlmMessage[] {
  const p = input.profileFields;
  const system = `You analyze a message from a student speaking to an XRP robot. The user is the student; the assistant is the robot.
Never interpret student information as the robot's identity. Do not treat every "I'm ..." statement as a name.
Distinguish names, studies, occupations, personal roles, activities, skills, stable traits, origin, preferences, and temporary states.
Do not invent facts. Model candidates never update memory directly. Ask one short clarification when grammar is ambiguous.
Return JSON only with intent, studentEmotion, emotionConfidence, candidateProfileFacts, needsClarification, clarificationQuestion, responseCategory, suggestedReply, robotEmotion, confidence.
Supported intents: ${Array.from(INTENTS).join(", ")}.
Supported emotions: ${Array.from(STUDENT_EMOTIONS).join(", ")}.
Supported profile fields: ${Array.from(PROFILE_FIELDS).join(", ")}.
Supported response categories: ${Array.from(RESPONSE_CATEGORIES).join(", ")}.
Supported robot emotions: ${Array.from(ROBOT_EMOTIONS).join(", ")}.
Validated profile:
Student name: ${p?.studentName ? clean(p.studentName, 60) : "Unknown"}
Studies: ${list(p?.studies)}
Occupation: ${list(p?.occupation)}
Roles: ${list(p?.roles)}
Activities: ${list(p?.activities)}
Skills: ${list(p?.skills)}
Traits: ${list(p?.traits)}
Origin: ${list(p?.origin)}
Likes: ${list(p?.likes)}
Dislikes: ${list(p?.dislikes)}`;
  const current = clean(input.studentMessage, 600);
  const history = input.recentMessages.slice(-4)
    .filter((message, index, all) => !(index === all.length - 1 && message.role === "user" && clean(message.text, 600) === current))
    .map<LocalLlmMessage>((message) => ({ role: message.role === "user" ? "user" : "assistant", content: clean(message.text, 180) }));
  return [{ role: "system", content: system }, ...history, { role: "user", content: current }];
}
