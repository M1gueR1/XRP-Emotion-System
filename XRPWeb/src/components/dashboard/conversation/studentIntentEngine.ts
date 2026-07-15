import type {
  ResponseCategory,
  SafetyAndUnderstandingResult,
  StudentEmotion,
  StudentIntent,
} from "./studentCompanionTypes";

export type DeterministicIntentResult = {
  intent: StudentIntent;
  studentEmotion: StudentEmotion;
  confidence: number;
  responseCategory: ResponseCategory;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectStudentIntent(text: string): DeterministicIntentResult {
  const value = normalize(text);

  if (/^(hi|hello|hey|hola|good morning|good afternoon|good evening)$/.test(value)) {
    return { intent: "greeting", studentEmotion: "neutral", confidence: 0.99, responseCategory: "greeting" };
  }
  if (/^(how are you|how are you doing|how are u|como estas)$/.test(value)) {
    return { intent: "wellbeing_question", studentEmotion: "neutral", confidence: 0.99, responseCategory: "wellbeing" };
  }
  if (/^(what is your name|whats your name|who are you)$/.test(value)) {
    return { intent: "robot_identity_question", studentEmotion: "neutral", confidence: 0.99, responseCategory: "robot_identity" };
  }
  if (/\b(what do you remember about me|what do you know about me|tell me what you know about me)\b/.test(value)) {
    return { intent: "memory_question", studentEmotion: "neutral", confidence: 0.98, responseCategory: "memory_answer" };
  }
  if (/^(goodbye|bye|see you|see you later)$/.test(value)) {
    return { intent: "farewell", studentEmotion: "neutral", confidence: 0.98, responseCategory: "farewell" };
  }
  if (/\b(my name is|you can call me|please call me|call me|change my name to)\b/.test(value)) {
    return { intent: "self_introduction", studentEmotion: "neutral", confidence: 0.98, responseCategory: "profile_acknowledgement" };
  }
  if (/\b(i like|i love|i prefer|i dont like|i dislike|i hate)\b/.test(value)) {
    return { intent: "preference_statement", studentEmotion: "neutral", confidence: 0.96, responseCategory: "preference_acknowledgement" };
  }
  if (/\b(won|passed|competition|proud|great news|good news)\b/.test(value)) {
    return { intent: "emotional_disclosure", studentEmotion: "excited", confidence: 0.88, responseCategory: "celebratory" };
  }
  if (/\b(lost|failed|sad|moved away|miss my|cry|cried|disappointed)\b/.test(value)) {
    return { intent: "emotional_disclosure", studentEmotion: "sad", confidence: 0.88, responseCategory: "empathetic_sad" };
  }
  if (/\b(worried|nervous|anxious|scared|afraid|stressful test)\b/.test(value)) {
    return { intent: "emotional_disclosure", studentEmotion: "worried", confidence: 0.9, responseCategory: "empathetic_worried" };
  }
  if (/\b(frustrated|annoyed|overwhelmed|nothing works)\b/.test(value)) {
    return { intent: "emotional_disclosure", studentEmotion: "frustrated", confidence: 0.88, responseCategory: "empathetic_frustrated" };
  }
  if (/\b(lonely|alone|no one talks to me)\b/.test(value)) {
    return { intent: "emotional_disclosure", studentEmotion: "lonely", confidence: 0.88, responseCategory: "empathetic_lonely" };
  }
  if (/\b(i study|i am studying|im studying|i work as|i am a|im a|i play|i practice|i am from|im from|i am good at|im good at)\b/.test(value)) {
    return { intent: "profile_statement", studentEmotion: "neutral", confidence: 0.9, responseCategory: "profile_acknowledgement" };
  }
  if (/^(can i tell you about my day|can we talk|i want to tell you something)$/.test(value)) {
    return { intent: "general_question", studentEmotion: "neutral", confidence: 0.9, responseCategory: "general_conversation" };
  }
  if (text.trim().endsWith("?")) {
    return { intent: "general_question", studentEmotion: "neutral", confidence: 0.62, responseCategory: "general_conversation" };
  }
  return { intent: "unknown", studentEmotion: "neutral", confidence: 0.3, responseCategory: "safe_fallback" };
}

export function separateSafetyFromUnderstanding(
  safetyAllowed: boolean,
  intent: DeterministicIntentResult
): SafetyAndUnderstandingResult {
  return {
    safetyStatus: safetyAllowed ? "safe" : "restricted",
    unsupportedIntent: safetyAllowed && intent.intent === "unknown",
    detectedIntent: intent.intent,
  };
}
