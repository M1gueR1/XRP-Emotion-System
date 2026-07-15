export type StudentIntent =
  | "greeting"
  | "wellbeing_question"
  | "robot_identity_question"
  | "self_introduction"
  | "profile_statement"
  | "preference_statement"
  | "memory_question"
  | "emotional_disclosure"
  | "general_question"
  | "farewell"
  | "clarification_answer"
  | "unknown";

export type StudentEmotion =
  | "neutral"
  | "happy"
  | "excited"
  | "sad"
  | "worried"
  | "frustrated"
  | "angry"
  | "lonely"
  | "confused";

export type ProfileFactField =
  | "name"
  | "studies"
  | "occupation"
  | "origin"
  | "age"
  | "like"
  | "dislike"
  | "role"
  | "activity"
  | "skill"
  | "trait";

export type CandidateProfileFact = {
  field: ProfileFactField;
  value: string;
  confidence: number;
  evidence: "explicit" | "inferred";
};

export type ResponseCategory =
  | "greeting"
  | "wellbeing"
  | "robot_identity"
  | "profile_acknowledgement"
  | "preference_acknowledgement"
  | "memory_answer"
  | "empathetic_sad"
  | "empathetic_worried"
  | "empathetic_frustrated"
  | "empathetic_lonely"
  | "celebratory"
  | "encouragement"
  | "clarification"
  | "farewell"
  | "general_conversation"
  | "safe_fallback";

export type CompanionRobotEmotion =
  | "idle"
  | "happy"
  | "sad"
  | "upset"
  | "excited"
  | "puzzled"
  | "in_love";

export type LocalSemanticAnalysis = {
  intent: StudentIntent;
  studentEmotion: StudentEmotion;
  emotionConfidence: number;
  candidateProfileFacts: CandidateProfileFact[];
  needsClarification: boolean;
  clarificationQuestion?: string;
  responseCategory: ResponseCategory;
  suggestedReply?: string;
  robotEmotion: CompanionRobotEmotion;
  confidence: number;
};

export type SafetyAndUnderstandingResult = {
  safetyStatus: "safe" | "restricted";
  unsupportedIntent: boolean;
  detectedIntent?: StudentIntent;
};

export type StudentIdentityState =
  | "unknown_student"
  | "awaiting_name"
  | "awaiting_name_confirmation"
  | "known_student";
