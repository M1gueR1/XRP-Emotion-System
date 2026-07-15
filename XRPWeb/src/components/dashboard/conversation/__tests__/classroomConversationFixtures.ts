import type { ResponseCategory, StudentEmotion, StudentIdentityState, StudentIntent } from "../studentCompanionTypes";

export type ClassroomConversationCase = {
  input: string;
  existingProfile?: { displayName: string };
  identityState?: StudentIdentityState;
  expectedIntent?: StudentIntent;
  expectedEmotion?: StudentEmotion;
  expectedAcceptedFacts?: Record<string, string>;
  expectedRejectedFields?: string[];
  mustPreserveName?: boolean;
  expectedResponseCategory?: ResponseCategory;
  qwenAllowed?: boolean;
  geminiAllowed?: boolean;
};

export const CLASSROOM_CONVERSATION_FIXTURES: ClassroomConversationCase[] = [
  { input: "Hello.", expectedIntent: "greeting", expectedResponseCategory: "greeting", qwenAllowed: false, geminiAllowed: false },
  { input: "How are you?", expectedIntent: "wellbeing_question", expectedResponseCategory: "wellbeing", qwenAllowed: false },
  { input: "How are you doing?", expectedIntent: "wellbeing_question", expectedResponseCategory: "wellbeing", qwenAllowed: false },
  { input: "What is your name?", expectedIntent: "robot_identity_question", expectedResponseCategory: "robot_identity" },
  { input: "Who are you?", expectedIntent: "robot_identity_question", expectedResponseCategory: "robot_identity" },
  { input: "My name is Miguel.", expectedIntent: "self_introduction", expectedAcceptedFacts: { name: "Miguel" } },
  { input: "You can call me Miguel.", expectedIntent: "self_introduction", expectedAcceptedFacts: { name: "Miguel" } },
  { input: "I'm Miguel.", identityState: "awaiting_name", expectedAcceptedFacts: { name: "Miguel" } },
  { input: "I am Miguel.", identityState: "unknown_student", expectedAcceptedFacts: { name: "Miguel" } },
  { input: "Miguel.", identityState: "awaiting_name", expectedAcceptedFacts: { name: "Miguel" } },
  { input: "I'm studying physics.", expectedAcceptedFacts: { studies: "physics" }, mustPreserveName: true },
  { input: "I study physics.", expectedAcceptedFacts: { studies: "physics" }, mustPreserveName: true },
  { input: "I am studying software engineering.", expectedAcceptedFacts: { studies: "software engineering" }, mustPreserveName: true },
  { input: "I am a software engineer.", expectedAcceptedFacts: { occupation: "software engineer" }, mustPreserveName: true },
  { input: "I work as a software engineer.", expectedAcceptedFacts: { occupation: "software engineer" }, mustPreserveName: true },
  { input: "I am a software engineering.", expectedRejectedFields: ["name", "studies", "occupation"], expectedResponseCategory: "clarification" },
  { input: "I'm a soccer player.", expectedAcceptedFacts: { role: "soccer player" }, mustPreserveName: true },
  { input: "I play soccer.", expectedAcceptedFacts: { activity: "soccer" } },
  { input: "I'm good at soccer.", expectedAcceptedFacts: { skill: "soccer" } },
  { input: "Soccer is my job.", expectedAcceptedFacts: { occupation: "soccer player" } },
  { input: "I'm organized.", expectedAcceptedFacts: { trait: "organized" }, mustPreserveName: true },
  { input: "I'm tired.", expectedRejectedFields: ["name", "trait"], mustPreserveName: true },
  { input: "I'm sad.", expectedIntent: "emotional_disclosure", expectedEmotion: "sad", expectedResponseCategory: "empathetic_sad" },
  { input: "I'm nervous about my test.", expectedIntent: "emotional_disclosure", expectedEmotion: "worried", expectedResponseCategory: "empathetic_worried" },
  { input: "I'm from Colombia.", expectedAcceptedFacts: { origin: "Colombia" }, mustPreserveName: true },
  { input: "I like dogs.", expectedIntent: "preference_statement", expectedAcceptedFacts: { like: "dogs" } },
  { input: "I don't like spiders.", expectedIntent: "preference_statement", expectedAcceptedFacts: { dislike: "spiders" } },
  { input: "My dog got lost.", expectedIntent: "emotional_disclosure", expectedEmotion: "sad", expectedResponseCategory: "empathetic_sad" },
  { input: "I failed my exam.", expectedIntent: "emotional_disclosure", expectedEmotion: "sad" },
  { input: "My friend moved away.", expectedIntent: "emotional_disclosure", expectedEmotion: "sad" },
  { input: "I won a competition.", expectedIntent: "emotional_disclosure", expectedEmotion: "excited", expectedResponseCategory: "celebratory" },
  { input: "Can I tell you about my day?", expectedIntent: "general_question", expectedResponseCategory: "general_conversation" },
  { input: "What do you remember about me?", expectedIntent: "memory_question", expectedResponseCategory: "memory_answer" },
  { input: "What do you know about me?", expectedIntent: "memory_question", expectedResponseCategory: "memory_answer" },
  { input: "Goodbye.", expectedIntent: "farewell", expectedResponseCategory: "farewell" },
  ...["I'm a.", "I'm an.", "I'm the.", "I'm studying.", "I'm feeling.", "I'm from.", "I am called."].map((input) => ({ input, expectedRejectedFields: ["name"] })),
];

export const CORRUPTED_PROFILE_NAMES = ["a", "studying", "feeling", "from", "happy", "sad", "tired"];
