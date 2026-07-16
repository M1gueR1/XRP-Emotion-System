import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaCommentDots,
  FaPaperPlane,
  FaTrash,
  FaUser,
} from "react-icons/fa";

import SensorCard from "./SensorCard";

import Dialog from "../../dialogs/dialog";

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  USER_PROFILE_CHANGED_EVENT,
  addMemoryItemsToUserProfile,
  factFromMemoryItem,
  getActiveUserProfile,
  getActiveUserProfileId,
  getProfileSanitizationNotice,
  getUserProfiles,
  isPlausibleProfileName,
  deleteUserProfile,
  learnFromProfileText,
  normalizeMemoryText,
  parseProfileText,
  setActiveUserProfileId,
  summarizeUserProfile,
  upsertUserProfile,
  type UserMemoryEmotion,
  type UserMemoryItem,
  type UserMemoryKind,
  type UserPreferencePolarity,
  type UserProfile,
} from "../profiles/userProfileStore";

import {
  validateCandidateProfileFact,
  validateProfileMemoryItem,
} from "../profiles/profileFactValidator";
import {
  extractContextualNameCandidate,
  identityStateForProfile,
  isAffirmativeNameConfirmation,
  isNegativeNameConfirmation,
  nameConfirmationPrompt,
  onboardingGreeting,
} from "../conversation/studentIdentityState";
import {
  detectStudentIntent,
  separateSafetyFromUnderstanding,
} from "../conversation/studentIntentEngine";
import { CompanionResponseBank } from "../conversation/responseBank";
import type {
  CandidateProfileFact,
  LocalSemanticAnalysis,
  ResponseCategory,
  StudentIdentityState,
  StudentIntent,
  StudentEmotion,
} from "../conversation/studentCompanionTypes";

import {
  findMatchingCustomEmotionKeyword,
  getEmotionOptionByKey,
} from "../keywords/customEmotionKeywordStore";

import {
  askGeminiRobotChat,
  type GeminiMemoryDraft,
  type GeminiRobotChatResponse,
} from "../llm/geminiRobotChatAdapter";

import LocalLlmSettingsPanel from "../llm/LocalLlmSettingsPanel";
import BootSafetyPanel from "../bootSafety/BootSafetyPanel";

import {
  LocalLlmChatAdapter,
} from "../llm/localLlmChatAdapter";

import {
  buildLocalLlmMessages,
  type LocalLlmProfileFields,
} from "../llm/localLlmPrompt";

import { buildLocalSemanticMessages } from "../llm/localLlmSemantic";

import {
  applyGeneratedReplySafety,
  hasProtectedExactAnswer as hasProtectedExactLocalAnswer,
  shouldAttemptGemini,
  shouldAttemptLocalLlm,
  type AiResponseMode,
} from "../llm/localLlmRouting";

import {
  DEFAULT_LOCAL_LLM_MODEL_ID,
  initialLocalLlmRuntimeState,
  type LocalLlmChatResponse,
  type LocalLlmRuntimeState,
} from "../llm/localLlmTypes";

import {
  inferLocalSocialReasoning,
  shouldPreferLocalSocialReasoning,
} from "../social/localSocialReasoningEngine";

import {
  classifyLocalEmotion,
  localMlEmpathyReply,
  shouldPreferLocalMlEmotion,
} from "../ml/localEmotionClassifier";

import {
  inferLocalEmpathy,
  isWeakLocalReply,
  shouldPreferLocalEmpathy,
} from "../empathy/localEmpathyEngine";

import {
  CHAT_KEYWORDS_CHANGED_EVENT,
  CHAT_KEYWORD_EMOTION_OPTIONS,
  deleteChatKeywordRule,
  findMatchingChatKeyword,
  getChatKeywordEmotionOption,
  getChatKeywordRules,
  upsertChatKeywordRule,
  type ChatKeywordEmotionKey,
  type ChatKeywordRule,
} from "../keywords/customChatKeywordStore";

import {
  didNormalizeChatInput,
  normalizeChatInputForReasoning,
} from "../text/chatTextNormalizer";

import {
  checkChildSafety,
} from "../safety/childSafetyEngine";

import {
  CHILD_SAFETY_CATEGORY_OPTIONS,
  SAFETY_POLICY_CHANGED_EVENT,
  exportChildSafetyPolicyJson,
  getChildSafetyPolicy,
  importChildSafetyPolicyJson,
  resetChildSafetyPolicy,
  saveChildSafetyPolicy,
  verifyTeacherPasscode,
  type ChildSafetyPolicy,
} from "../safety/childSafetyPolicyStore";

import {
  getFaceIdentityProfiles,
  normalizeFaceIdentityDisplayName,
} from "../vision/faceIdentityStore";


type ChatMessage = {
  id: string;
  role: "user" | "robot";
  text: string;
  emotionLabel?: string;
  createdAt: string;
};


type ChatEmotionDecision = {
  emotionId: number;
  emotionLabel: string;
  confidence: number;
  reason: string;
};


type MemoryViewMode =
  | "neural_network"
  | "basic";

type RobotResponseSource =
  | "safety"
  | "profile parser"
  | "custom keyword"
  | "memory"
  | "small talk"
  | "onboarding"
  | "local classifier"
  | "response bank"
  | "local semantic model"
  | "local conversational model"
  | "technical fallback"
  | "safe fallback"
  | "social reasoning"
  | "empathy"
  | "local rules"
  | "local LLM"
  | "Gemini"
  | "fallback";

type RobotResponseDebug = {
  source: RobotResponseSource;
  localModelCalled: boolean;
  mode: string;
  detectedIntent: StudentIntent;
  studentEmotion: StudentEmotion;
  emotionConfidence: number;
  responseCategory: ResponseCategory;
  identityState: StudentIdentityState;
  profileCandidates: string[];
  acceptedProfileUpdates: string[];
  rejectedProfileUpdates: string[];
  clarificationRequested: boolean;
  lightweightClassifierUsed: boolean;
  qwenRequestId?: string;
  qwenParseStatus: string;
  geminiCalled: boolean;
  safetyResult: "safe" | "restricted";
  unsupportedIntent: boolean;
};

const FACE_GREETING_COOLDOWN_MS =
  30_000;


const EMOTION_IDLE_ID = 0;
const EMOTION_HAPPY_ID = 1;
const EMOTION_EXCITED_ID = 3;
const EMOTION_UPSET_ID = 8;
const EMOTION_SAD_ID = 9;
const EMOTION_IN_LOVE_ID = 12;


const inputClass =
  "min-w-0 rounded border border-white bg-black px-2 py-1 text-xs text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white";

const buttonClass =
  "rounded border border-white bg-black px-3 py-1 font-bold text-white transition hover:bg-white hover:text-black";


const AI_RESPONSE_MODE_STORAGE_KEY =
  "xrp-emotion-system:ai-response-mode:v1";

const LEGACY_GEMINI_ENABLED_STORAGE_KEY =
  "xrp-emotion-system:gemini-chat-enabled:v1";

const GEMINI_API_KEY_STORAGE_KEY =
  "xrp-emotion-system:gemini-api-key:v1";

const GEMINI_MODEL_STORAGE_KEY =
  "xrp-emotion-system:gemini-model:v1";

const ROBOT_NAME_STORAGE_KEY =
  "xrp-emotion-system:robot-name:v1";

const LOCAL_LLM_ENABLED_STORAGE_KEY =
  "xrp-emotion-system:local-llm-enabled:v1";

const LOCAL_LLM_MODEL_STORAGE_KEY =
  "xrp-emotion-system:local-llm-model:v1";


function readLocalStorage(
  key: string,
  fallback = ""
): string {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return fallback;
  }

  return (
    window.localStorage.getItem(key) ??
    fallback
  );
}


function writeLocalStorage(
  key: string,
  value: string
): void {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return;
  }

  window.localStorage.setItem(
    key,
    value
  );
}


function isAiResponseMode(
  value: string
): value is AiResponseMode {
  return (
    value === "local_keywords_only" ||
    value ===
      "local_downloaded_model_only" ||
    value === "hybrid_local" ||
    value === "smart_fallback" ||
    value === "rescue_with_gemini"
  );
}


function readInitialAiResponseMode():
  AiResponseMode {
  const savedMode =
    readLocalStorage(
      AI_RESPONSE_MODE_STORAGE_KEY,
      ""
    );

  if (isAiResponseMode(savedMode)) {
    return savedMode;
  }

  if (savedMode === "local_only") {
    return "local_keywords_only";
  }

  const legacyGeminiEnabled =
    readLocalStorage(
      LEGACY_GEMINI_ENABLED_STORAGE_KEY,
      "false"
    ) === "true";

  return legacyGeminiEnabled
    ? "smart_fallback"
    : "local_keywords_only";
}


function aiResponseModeLabel(
  mode: AiResponseMode
): string {
  switch (mode) {
    case "local_keywords_only":
      return "Keywords / rules only";
    case "local_downloaded_model_only":
      return "Downloaded local model only";
    case "hybrid_local":
      return "Keywords + local semantic intelligence";
    case "smart_fallback":
      return "Keywords + Gemini rescue";
    case "rescue_with_gemini":
      return "Full Gemini";
    default:
      return "Only local keywords";
  }
}


function emotionEmoji(
  emotionLabel?: string
): string {
  switch (emotionLabel) {
    case "Happy":
      return "😊";

    case "Sad":
      return "😢";

    case "Excited":
      return "🤩";

    case "Upset":
      return "😠";

    case "In love":
      return "😍";

    default:
      return "🤖";
  }
}


function isSimpleGreetingOrSmallTalk(
  text: string
): boolean {
  const normalized =
    normalizeText(text);

  return /^(hi|hello|hey|hola|buenas|good morning|good afternoon|good evening|how are you|how are u|como estas|cómo estás)\??$/.test(
    normalized
  );
}


function smallTalkReply(
  text: string,
  robotName: string,
  displayName?: string
): string {
  const normalized =
    normalizeText(text);

  const namePart =
    displayName
      ? `, ${displayName}`
      : "";

  if (
    normalized.includes("how are you") ||
    normalized.includes("how are u") ||
    normalized.includes("como estas")
  ) {
    return `I'm doing well${namePart}. I'm ${robotName}, and I'm ready to listen.`;
  }

  return `Hi${namePart}. I'm ${robotName}. You can tell me how you're feeling or what happened today.`;
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


function nowIso(): string {
  return new Date().toISOString();
}


function normalizeText(
  value: string
): string {
  return normalizeMemoryText(value);
}


function emitDashboardEmotionPreview(
  decision: ChatEmotionDecision,
  message: string
): void {
  window.dispatchEvent(
    new CustomEvent(
      "xrp:dashboard-emotion-preview",
      {
        detail: {
          source:
            "robot_chat",
          emotionId:
            decision.emotionId,
          emotionLabel:
            decision.emotionLabel,
          signal:
            message,
          confidence:
            decision.confidence,
          reason:
            decision.reason,
        },
      }
    )
  );
}


function memoryKeywords(
  memory: UserMemoryItem
): string[] {
  return normalizeText(
    [
      memory.target,
      memory.value,
      memory.field,
    ]
      .filter(Boolean)
      .join(" ")
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >= 4 &&
        ![
          "likes",
          "love",
          "prefer",
          "does",
          "dislike",
          "hate",
          "from",
          "makes",
          "happy",
          "sad",
          "upset",
          "excited",
          "studies",
          "works",
        ].includes(word)
    );
}


function relevantMemoryItems(
  text: string,
  profile: UserProfile | null
): UserMemoryItem[] {
  if (!profile) {
    return [];
  }

  const normalized =
    normalizeText(text);

  return profile.memoryItems
    .filter((memory) => {
      const keywords =
        memoryKeywords(memory);

      const matchedCount =
        keywords.filter((keyword) =>
          normalized.includes(keyword)
        ).length;

      if (
        memory.kind === "emotional_trigger" &&
        memory.emotion
      ) {
        if (
          (
            memory.emotion === "sad" ||
            memory.emotion === "upset"
          ) &&
          matchedCount >= 1 &&
          hasNegativeEvent(normalized)
        ) {
          return true;
        }

        if (
          (
            memory.emotion === "happy" ||
            memory.emotion === "excited"
          ) &&
          matchedCount >= 1 &&
          hasPositiveEvent(normalized)
        ) {
          return true;
        }

        return (
          matchedCount >=
          Math.min(2, keywords.length)
        );
      }

      return matchedCount >= 1;
    })
    .slice(0, 4);
}


function textHasAny(
  normalized: string,
  words: string[]
): boolean {
  return words.some((word) =>
    normalized.includes(word)
  );
}


function hasNegativeEvent(
  normalized: string
): boolean {
  return textHasAny(normalized, [
    "lost",
    "lose",
    "losing",
    "perdio",
    "perdio",
    "perdimos",
    "failed",
    "fail",
    "broke",
    "broken",
    "bad",
    "sad",
    "triste",
    "cry",
    "llorar",
    "bad news",
    "no funciona",
    "not working",
  ]);
}


function hasPositiveEvent(
  normalized: string
): boolean {
  return textHasAny(normalized, [
    "won",
    "win",
    "winning",
    "gano",
    "ganamos",
    "passed",
    "pass",
    "worked",
    "working",
    "funciona",
    "fixed",
    "great",
    "awesome",
    "good news",
    "victory",
    "champion",
  ]);
}


function emotionDecisionFromMemoryTrigger(
  text: string,
  profile: UserProfile | null
): ChatEmotionDecision | null {
  const relevant =
    relevantMemoryItems(text, profile);

  const trigger =
    relevant.find(
      (item) =>
        item.kind === "emotional_trigger" &&
        item.emotion
    );

  if (!trigger || !trigger.emotion) {
    return null;
  }

  if (trigger.emotion === "sad") {
    return {
      emotionId:
        EMOTION_SAD_ID,
      emotionLabel:
        "Sad",
      confidence:
        Math.max(
          0.76,
          trigger.intensity
        ),
      reason:
        `The message matched a saved sad trigger: ${factFromMemoryItem(
          trigger,
          profile?.displayName ?? "User"
        )}.`,
    };
  }

  if (trigger.emotion === "excited") {
    return {
      emotionId:
        EMOTION_EXCITED_ID,
      emotionLabel:
        "Excited",
      confidence:
        Math.max(
          0.76,
          trigger.intensity
        ),
      reason:
        `The message matched a saved excitement trigger: ${factFromMemoryItem(
          trigger,
          profile?.displayName ?? "User"
        )}.`,
    };
  }

  if (trigger.emotion === "upset") {
    return {
      emotionId:
        EMOTION_UPSET_ID,
      emotionLabel:
        "Upset",
      confidence:
        Math.max(
          0.76,
          trigger.intensity
        ),
      reason:
        `The message matched a saved upset trigger: ${factFromMemoryItem(
          trigger,
          profile?.displayName ?? "User"
        )}.`,
    };
  }

  if (trigger.emotion === "happy") {
    return {
      emotionId:
        EMOTION_HAPPY_ID,
      emotionLabel:
        "Happy",
      confidence:
        Math.max(
          0.70,
          trigger.intensity
        ),
      reason:
        `The message matched a saved happy trigger: ${factFromMemoryItem(
          trigger,
          profile?.displayName ?? "User"
        )}.`,
    };
  }

  return null;
}


function inferLocalEmotion(
  text: string,
  profile?: UserProfile | null
): ChatEmotionDecision {
  const normalized =
    normalizeText(text);

  const memoryTriggerDecision =
    emotionDecisionFromMemoryTrigger(
      text,
      profile ?? null
    );

  if (memoryTriggerDecision) {
    return memoryTriggerDecision;
  }

  const relevant =
    relevantMemoryItems(
      text,
      profile ?? null
    );

  if (
    relevant.length > 0 &&
    hasNegativeEvent(normalized)
  ) {
    return {
      emotionId:
        EMOTION_SAD_ID,
      emotionLabel:
        "Sad",
      confidence:
        0.82,
      reason:
        `The message connects a negative event with saved memory: ${relevant
          .map((item) =>
            factFromMemoryItem(
              item,
              profile?.displayName ?? "User"
            )
          )
          .join("; ")}.`,
    };
  }

  if (
    relevant.length > 0 &&
    hasPositiveEvent(normalized)
  ) {
    return {
      emotionId:
        EMOTION_EXCITED_ID,
      emotionLabel:
        "Excited",
      confidence:
        0.80,
      reason:
        `The message connects a positive event with saved memory: ${relevant
          .map((item) =>
            factFromMemoryItem(
              item,
              profile?.displayName ?? "User"
            )
          )
          .join("; ")}.`,
    };
  }

  if (
    /\b(lost|lose|losing|failed|fail|sad|triste|cry|llorar|bad news)\b/.test(
      normalized
    )
  ) {
    return {
      emotionId:
        EMOTION_SAD_ID,
      emotionLabel:
        "Sad",
      confidence:
        0.70,
      reason:
        "Local chat heuristic detected sad or loss-related language.",
    };
  }

  if (
    /\b(hate|odio|angry|mad|bravo|furioso|annoying|bad robot|stupid|frustrated)\b/.test(
      normalized
    )
  ) {
    return {
      emotionId:
        EMOTION_UPSET_ID,
      emotionLabel:
        "Upset",
      confidence:
        0.72,
      reason:
        "Local chat heuristic detected upset/frustration language.",
    };
  }

  if (
    /\b(love you|te quiero|te amo|i like you|eres mi amigo|you are my friend)\b/.test(
      normalized
    )
  ) {
    return {
      emotionId:
        EMOTION_IN_LOVE_ID,
      emotionLabel:
        "In love",
      confidence:
        0.75,
      reason:
        "Local chat heuristic detected affection/friendship language.",
    };
  }

  if (
    /\b(excited|great|awesome|genial|increible|increible|vamos|lets go|let s go|play|jugar)\b/.test(
      normalized
    )
  ) {
    return {
      emotionId:
        EMOTION_EXCITED_ID,
      emotionLabel:
        "Excited",
      confidence:
        0.68,
      reason:
        "Local chat heuristic detected excitement language.",
    };
  }

  if (
    /\b(happy|feliz|good|bien|cool|nice|thanks|gracias|like|gusta|hello|hi|hola)\b/.test(
      normalized
    )
  ) {
    return {
      emotionId:
        EMOTION_HAPPY_ID,
      emotionLabel:
        "Happy",
      confidence:
        0.62,
      reason:
        "Local chat heuristic detected positive or greeting language.",
    };
  }

  return {
    emotionId:
      EMOTION_IDLE_ID,
    emotionLabel:
      "Idle",
    confidence:
      0.45,
    reason:
      "No strong emotional cue was detected.",
  };
}


function isIdentityQuestion(
  text: string
): boolean {
  const normalized =
    normalizeText(text);

  return (
    normalized.includes("who am i") ||
    normalized.includes("what do you know about me") ||
    normalized.includes("what do you remember about me") ||
    normalized.includes("que sabes de mi") ||
    normalized.includes("que recuerdas de mi")
  );
}


function extractPreferenceQuestionTarget(
  text: string
): string | null {
  const normalized =
    normalizeText(text);

  const match =
    normalized.match(
      /\b(?:do i like|do i love|do i prefer|do i hate|me gusta|me encanta|odio)\s+(.+?)\??$/
    );

  return match?.[1]?.trim() || null;
}


function isWhatDoILikeQuestion(
  text: string
): boolean {
  const normalized =
    normalizeText(text);

  return (
    normalized.includes("what do i like") ||
    normalized.includes("what do i love") ||
    normalized.includes("que me gusta") ||
    normalized.includes("qué me gusta")
  );
}


function isWhatMakesMeQuestion(
  text: string,
  emotion: string
): boolean {
  const normalized =
    normalizeText(text);

  return (
    normalized.includes(`what makes me ${emotion}`) ||
    normalized.includes(`que me pone ${emotion}`) ||
    normalized.includes(`qué me pone ${emotion}`)
  );
}


function answerPreferenceQuestion(
  text: string,
  profile: UserProfile | null
): string | null {
  if (!profile) {
    return null;
  }

  const target =
    extractPreferenceQuestionTarget(text);

  if (target) {
    const normalizedTarget =
      normalizeText(target);

    const memory =
      profile.memoryItems.find(
        (item) =>
          item.kind === "preference" &&
          item.target &&
          normalizeText(item.target).includes(
            normalizedTarget
          )
      );

    if (!memory) {
      return `I do not know yet if you like ${target}. You can tell me and I will remember it.`;
    }

    if (
      memory.polarity === "dislike" ||
      memory.polarity === "hate"
    ) {
      return `No, ${profile.displayName}. I remember that you do not like ${memory.target}.`;
    }

    if (memory.polarity === "love") {
      return `Yes, ${profile.displayName}. I remember that you love ${memory.target}.`;
    }

    if (memory.polarity === "prefer") {
      return `Yes, ${profile.displayName}. I remember that you prefer ${memory.target}.`;
    }

    return `Yes, ${profile.displayName}. I remember that you like ${memory.target}.`;
  }

  if (isWhatDoILikeQuestion(text)) {
    const positive =
      profile.memoryItems.filter(
        (item) =>
          item.kind === "preference" &&
          item.target &&
          (
            item.polarity === "like" ||
            item.polarity === "love" ||
            item.polarity === "prefer"
          )
      );

    if (positive.length === 0) {
      return `I do not know what you like yet, ${profile.displayName}.`;
    }

    return `${profile.displayName}, I remember that you like: ${positive
      .map((item) => item.target)
      .join(", ")}.`;
  }

  return null;
}


function answerTriggerQuestion(
  text: string,
  profile: UserProfile | null
): string | null {
  if (!profile) {
    return null;
  }

  const emotions: Array<{
    key: string;
    label: string;
  }> = [
    {
      key: "sad",
      label: "sad",
    },
    {
      key: "happy",
      label: "happy",
    },
    {
      key: "excited",
      label: "excited",
    },
    {
      key: "upset",
      label: "upset",
    },
  ];

  for (const emotion of emotions) {
    if (
      !isWhatMakesMeQuestion(
        text,
        emotion.key
      )
    ) {
      continue;
    }

    const triggers =
      profile.memoryItems.filter(
        (item) =>
          item.kind === "emotional_trigger" &&
          item.emotion === emotion.key &&
          item.target
      );

    if (triggers.length === 0) {
      return `I do not know what makes you ${emotion.label} yet, ${profile.displayName}.`;
    }

    return `${profile.displayName}, I remember this makes you ${emotion.label}: ${triggers
      .map((item) => item.target)
      .join(", ")}.`;
  }

  return null;
}


function buildMemoryQuestionReply(
  input: string,
  profile: UserProfile | null
): string | null {
  if (!profile) {
    if (
      isIdentityQuestion(input) ||
      extractPreferenceQuestionTarget(input)
    ) {
      return "I do not know who you are yet. You can introduce yourself in the chat.";
    }

    return null;
  }

  const preferenceAnswer =
    answerPreferenceQuestion(
      input,
      profile
    );

  if (preferenceAnswer) {
    return preferenceAnswer;
  }

  const triggerAnswer =
    answerTriggerQuestion(
      input,
      profile
    );

  if (triggerAnswer) {
    return triggerAnswer;
  }

  if (isIdentityQuestion(input)) {
    const safeName = replyDisplayName(profile);
    if (profile.memoryItems.length === 0) {
      return safeName
        ? `Your name is ${safeName}. I do not have other saved facts about you yet.`
        : "I do not have a valid saved name or other profile facts for you yet.";
    }

    return `${safeName ? `Your name is ${safeName}. ` : ""}I remember: ${profile.memoryItems
      .map((item) =>
        factFromMemoryItem(
          item,
          safeName ?? "You"
        )
      )
      .join("; ")}.`;
  }

  return null;
}


function describeIntensity(
  intensity: number
): string {
  if (intensity >= 0.88) {
    return "very strongly";
  }

  if (intensity >= 0.72) {
    return "strongly";
  }

  if (intensity >= 0.55) {
    return "moderately";
  }

  return "a little";
}


function memoryItemAsUserPhrase(
  item: UserMemoryItem
): string {
  if (
    item.kind === "preference" &&
    item.target &&
    item.polarity
  ) {
    if (
      item.polarity === "hate" ||
      item.polarity === "dislike"
    ) {
      return `you do not like ${item.target}`;
    }

    if (item.polarity === "prefer") {
      return `you prefer ${item.target}`;
    }

    if (item.polarity === "love") {
      return `you love ${item.target}`;
    }

    return `you like ${item.target}`;
  }

  if (
    item.kind === "identity" &&
    item.field === "origin" &&
    item.value
  ) {
    return `you are from ${item.value}`;
  }

  if (
    item.kind === "identity" &&
    item.field === "age" &&
    item.value
  ) {
    return `you are ${item.value} years old`;
  }

  if (
    item.kind === "identity" &&
    item.field === "pets" &&
    item.value
  ) {
    return `you have ${item.value}`;
  }

  if (
    item.kind === "study" &&
    item.value
  ) {
    return `you study ${item.value}`;
  }

  if (
    item.kind === "work" &&
    item.value
  ) {
    return `you work as ${item.value}`;
  }

  if (item.kind === "role" && item.value) {
    return `you are a ${item.value}`;
  }

  if (item.kind === "activity" && (item.value || item.target)) {
    return `you do ${item.value ?? item.target}`;
  }

  if (item.kind === "skill" && item.value) {
    return `you are skilled at ${item.value}`;
  }

  if (item.kind === "trait" && item.value) {
    return `you describe yourself as ${item.value}`;
  }

  if (
    item.kind === "emotional_trigger" &&
    item.target &&
    item.emotion
  ) {
    return `${item.target} makes you ${item.emotion.replace("_", " ")}`;
  }

  return (
    item.value ??
    item.target ??
    item.sourceText
  );
}


function isStrongEmotionalDecision(
  decision: ChatEmotionDecision
): boolean {
  return (
    decision.confidence >= 0.62 &&
    (
      decision.emotionLabel === "Sad" ||
      decision.emotionLabel === "Upset" ||
      decision.emotionLabel === "Excited" ||
      decision.emotionLabel === "In love"
    )
  );
}


function replyDisplayName(
  profile: UserProfile | null | undefined
): string | undefined {
  if (
    profile?.displayName &&
    isPlausibleProfileName(
      profile.displayName
    )
  ) {
    return profile.displayName;
  }

  return undefined;
}


function buildRobotReply(
  input: string,
  profileBefore: UserProfile | null,
  profileAfter: UserProfile | null,
  parsedMemoryItems: UserMemoryItem[],
  decision: ChatEmotionDecision,
  keywordPhrase?: string
): string {
  const profile =
    profileAfter ?? profileBefore;

  const memoryAnswer =
    buildMemoryQuestionReply(
      input,
      profile
    );

  if (memoryAnswer) {
    return memoryAnswer;
  }

  if (
    !profile &&
    parsedMemoryItems.length > 0
  ) {
    return "I understood some personal details, but I still do not know your name. You can say: “Hi, I'm Santiago” and I will save them to your profile.";
  }

  const name =
    replyDisplayName(profile);

  const learnedNewProfile =
    profileAfter &&
    (
      !profileBefore ||
      profileBefore.id !== profileAfter.id
    );

  const learnedFacts =
    profileAfter &&
    profileBefore &&
    profileBefore.id === profileAfter.id &&
    profileAfter.memoryItems.length >
      profileBefore.memoryItems.length;

  if (learnedNewProfile) {
    const learnedName =
      replyDisplayName(profileAfter);

    if (!learnedName) {
      return "I understood some personal details, but I still do not have a safe name to use for you.";
    }

    const facts =
      profileAfter.memoryItems.length > 0
        ? ` I also saved what I learned: ${profileAfter.memoryItems
            .map(memoryItemAsUserPhrase)
            .join("; ")}.`
        : "";

    if (isStrongEmotionalDecision(decision)) {
      if (decision.emotionLabel === "Sad") {
        return `Nice to meet you, ${learnedName}. I'm sorry you're feeling this way. I'm here with you.${facts}`;
      }

      if (decision.emotionLabel === "Upset") {
        return `Nice to meet you, ${learnedName}. That sounds frustrating, but we'll take it one step at a time.${facts}`;
      }

      if (decision.emotionLabel === "Excited") {
        return `Nice to meet you, ${learnedName}. That sounds exciting.${facts}`;
      }

      if (decision.emotionLabel === "In love") {
        return `Nice to meet you, ${learnedName}. I like being your robot friend too.${facts}`;
      }
    }

    return `Nice to meet you, ${learnedName}.${facts}`;
  }

  if (
    learnedFacts &&
    profileAfter &&
    profileBefore
  ) {
    const newItems =
      profileAfter.memoryItems.slice(
        profileBefore.memoryItems.length
      );

    const strongest =
      newItems
        .filter(
          (item) =>
            item.kind === "preference"
        )
        .sort(
          (left, right) =>
            right.intensity -
            left.intensity
        )[0];

    const learnedName =
      replyDisplayName(profileAfter);

    const prefix =
      learnedName
        ? `Got it, ${learnedName}.`
        : "Got it.";

    if (strongest?.target) {
      return `${prefix} I learned that you ${describeIntensity(
        strongest.intensity
      )} ${
        strongest.polarity === "hate" ||
        strongest.polarity === "dislike"
          ? "do not like"
          : strongest.polarity === "love"
            ? "love"
            : strongest.polarity === "prefer"
              ? "prefer"
              : "like"
      } ${strongest.target}.`;
    }

    return `${prefix} I updated your memory: ${newItems
      .map(memoryItemAsUserPhrase)
      .join("; ")}.`;
  }

  const relevant =
    relevantMemoryItems(
      input,
      profile ?? null
    );

  if (keywordPhrase && name) {
    return `I matched "${keywordPhrase}", ${name}, so I changed my emotion to ${decision.emotionLabel}.`;
  }

  if (keywordPhrase) {
    return `I matched "${keywordPhrase}", so I changed my emotion to ${decision.emotionLabel}.`;
  }

  if (
    name &&
    relevant.length > 0
  ) {
    const memoryText =
      relevant
        .map(memoryItemAsUserPhrase)
        .join("; ");

    if (decision.emotionLabel === "Sad") {
      return `Oh no, ${name}. I remember ${memoryText}, so this sounds sad for you.`;
    }

    if (decision.emotionLabel === "Excited") {
      return `That sounds exciting, ${name}. I remember ${memoryText}.`;
    }

    if (decision.emotionLabel === "Upset") {
      return `I understand, ${name}. Based on what I remember, this sounds frustrating.`;
    }

    return `I remember ${memoryText}, ${name}.`;
  }

  if (name) {
    if (decision.emotionLabel === "Sad") {
      return `I am sorry, ${name}. That sounds sad.`;
    }

    if (decision.emotionLabel === "Upset") {
      return `I understand, ${name}. That sounds frustrating.`;
    }

    if (decision.emotionLabel === "Happy") {
      return `Nice, ${name}. That sounds good.`;
    }

    if (decision.emotionLabel === "In love") {
      return `Aww, ${name}. I like working with you too.`;
    }

    return `I am listening, ${name}.`;
  }

  if (decision.emotionLabel === "Sad") {
    return "I'm sorry that happened. That sounds disappointing, but I'm here with you.";
  }

  if (decision.emotionLabel === "Upset") {
    return "That sounds frustrating. Let's take it one step at a time.";
  }

  if (decision.emotionLabel === "Happy") {
    return "Nice. I'm glad to hear that.";
  }

  if (decision.emotionLabel === "Excited") {
    return "Wow, that's exciting!";
  }

  if (decision.emotionLabel === "In love") {
    return "Aww. I like being your robot friend too.";
  }

  return "I am listening.";
}



function emotionDecisionFromGemini(
  response: GeminiRobotChatResponse
): ChatEmotionDecision {
  switch (response.emotionKey) {
    case "happy":
      return {
        emotionId: EMOTION_HAPPY_ID,
        emotionLabel: "Happy",
        confidence: response.confidence,
        reason: response.reason,
      };

    case "sad":
      return {
        emotionId: EMOTION_SAD_ID,
        emotionLabel: "Sad",
        confidence: response.confidence,
        reason: response.reason,
      };

    case "excited":
      return {
        emotionId: EMOTION_EXCITED_ID,
        emotionLabel: "Excited",
        confidence: response.confidence,
        reason: response.reason,
      };

    case "in_love":
      return {
        emotionId: EMOTION_IN_LOVE_ID,
        emotionLabel: "In love",
        confidence: response.confidence,
        reason: response.reason,
      };

    case "upset":
      return {
        emotionId: EMOTION_UPSET_ID,
        emotionLabel: "Upset",
        confidence: response.confidence,
        reason: response.reason,
      };

    default:
      return {
        emotionId: EMOTION_IDLE_ID,
        emotionLabel: "Idle",
        confidence: response.confidence,
        reason: response.reason,
      };
  }
}


function emotionDecisionFromLocalLlm(
  response: LocalLlmChatResponse
): ChatEmotionDecision {
  const emotion = {
    happy: [EMOTION_HAPPY_ID, "Happy"],
    sad: [EMOTION_SAD_ID, "Sad"],
    upset: [EMOTION_UPSET_ID, "Upset"],
    excited: [EMOTION_EXCITED_ID, "Excited"],
    in_love: [EMOTION_IN_LOVE_ID, "In love"],
    idle: [EMOTION_IDLE_ID, "Idle"],
  }[response.emotionKey] as [number, string];

  return {
    emotionId: emotion[0],
    emotionLabel: emotion[1],
    confidence: response.confidence,
    reason: `Browser-local LLM: ${response.reason}`,
  };
}

function emotionDecisionFromSemantic(
  response: LocalSemanticAnalysis
): ChatEmotionDecision {
  const emotion = {
    happy: [EMOTION_HAPPY_ID, "Happy"],
    sad: [EMOTION_SAD_ID, "Sad"],
    upset: [EMOTION_UPSET_ID, "Upset"],
    excited: [EMOTION_EXCITED_ID, "Excited"],
    in_love: [EMOTION_IN_LOVE_ID, "In love"],
    puzzled: [EMOTION_IDLE_ID, "Puzzled"],
    idle: [EMOTION_IDLE_ID, "Idle"],
  }[response.robotEmotion] as [number, string];

  return {
    emotionId: emotion[0],
    emotionLabel: emotion[1],
    confidence: response.emotionConfidence,
    reason: `Browser-local semantic analysis detected ${response.studentEmotion} emotion and ${response.intent} intent.`,
  };
}


function createMemoryItemFromGeminiDraft(
  draft: GeminiMemoryDraft,
  fallbackSourceText: string
): UserMemoryItem | null {
  const createdAt =
    nowIso();

  const kind =
    draft.kind as UserMemoryKind;

  const hasContent =
    Boolean(
      draft.value ||
      draft.target ||
      draft.field
    );

  if (!hasContent) {
    return null;
  }

  const item: UserMemoryItem = {
    id: safeRandomId(),
    kind,
    field: draft.field,
    value: draft.value,
    target: draft.target,
    polarity:
      draft.polarity as
        | UserPreferencePolarity
        | undefined,
    emotion:
      draft.emotion as
        | UserMemoryEmotion
        | undefined,
    intensity:
      Math.min(
        1,
        Math.max(
          0.05,
          draft.intensity ?? 0.65
        )
      ),
    sourceText:
      draft.sourceText ??
      fallbackSourceText,
    source: "llm",
    createdAt,
    updatedAt: createdAt,
  };

  return validateProfileMemoryItem(item).accepted ? item : null;
}

function createMemoryItemFromSemanticCandidate(
  candidate: CandidateProfileFact,
  sourceText: string
): UserMemoryItem | null {
  if (candidate.field === "name" || !validateCandidateProfileFact(candidate).accepted) {
    return null;
  }
  if (!normalizeText(sourceText).includes(normalizeText(candidate.value))) {
    return null;
  }
  const createdAt = nowIso();
  const common = {
    id: safeRandomId(),
    intensity: candidate.confidence,
    sourceText,
    source: "llm" as const,
    createdAt,
    updatedAt: createdAt,
  };
  const item: UserMemoryItem = candidate.field === "like" || candidate.field === "dislike"
    ? { ...common, kind: "preference", target: candidate.value, polarity: candidate.field }
    : candidate.field === "studies"
      ? { ...common, kind: "study", field: "studies", value: candidate.value }
      : candidate.field === "occupation"
        ? { ...common, kind: "work", field: "occupation", value: candidate.value }
        : candidate.field === "role" || candidate.field === "skill" || candidate.field === "trait"
          ? { ...common, kind: candidate.field, field: candidate.field, value: candidate.value }
          : candidate.field === "activity"
            ? { ...common, kind: "activity", field: "activity", value: candidate.value, target: candidate.value }
            : { ...common, kind: "identity", field: candidate.field, value: candidate.value };
  return validateProfileMemoryItem(item).accepted ? item : null;
}


function getUserProfileByIdFallback(
  profileId: string
): UserProfile | null {
  return (
    getUserProfiles().find(
      (profile) =>
        profile.id === profileId
    ) ?? null
  );
}


function profileMemoryFacts(
  profile: UserProfile | null
): string[] {
  if (!profile) {
    return [];
  }

  if (profile.memoryItems.length > 0) {
    return profile.memoryItems.map((item) =>
      factFromMemoryItem(
        item,
        profile.displayName
      )
    );
  }

  return profile.facts.map(
    (fact) => fact.text
  );
}


function localLlmProfileFields(
  profile: UserProfile | null
): LocalLlmProfileFields {
  const fields:
    LocalLlmProfileFields = {};

  if (!profile) {
    return fields;
  }

  if (
    isPlausibleProfileName(
      profile.displayName
    )
  ) {
    fields.studentName =
      profile.displayName;
  }

  const studies =
    profile.memoryItems
      .filter((item) =>
        item.kind === "study" &&
        Boolean(item.value)
      )
      .map((item) => item.value as string);

  const occupation =
    profile.memoryItems
      .filter((item) =>
        item.kind === "work" &&
        Boolean(item.value)
      )
      .map((item) => item.value as string);

  const interests =
    profile.memoryItems
      .filter((item) =>
        item.kind === "preference" &&
        Boolean(item.target)
      )
      .map((item) => item.target as string);

  const valuesFor = (kind: UserMemoryKind): string[] =>
    profile.memoryItems
      .filter((item) => item.kind === kind && Boolean(item.value ?? item.target))
      .map((item) => (item.value ?? item.target) as string);

  fields.roles = valuesFor("role");
  fields.activities = valuesFor("activity");
  fields.skills = valuesFor("skill");
  fields.traits = valuesFor("trait");
  fields.origin = profile.memoryItems
    .filter((item) => item.kind === "identity" && item.field === "origin" && item.value)
    .map((item) => item.value as string);
  fields.likes = profile.memoryItems
    .filter((item) => item.kind === "preference" && ["like", "love", "prefer"].includes(item.polarity ?? "") && item.target)
    .map((item) => item.target as string);
  fields.dislikes = profile.memoryItems
    .filter((item) => item.kind === "preference" && ["dislike", "hate"].includes(item.polarity ?? "") && item.target)
    .map((item) => item.target as string);

  if (studies.length > 0) {
    fields.studies = studies;
  }

  if (occupation.length > 0) {
    fields.occupation = occupation;
  }

  if (interests.length > 0) {
    fields.interests = interests;
  }

  return fields;
}


type MemoryNetworkViewProps = {
  profile: UserProfile | null;
};


function MemoryNetworkView({
  profile,
}: MemoryNetworkViewProps) {
  const facts =
    profileMemoryFacts(profile);

  if (!profile) {
    return (
      <div className="rounded-xl border border-white bg-black p-4 text-sm text-zinc-200">
        No active profile yet.
      </div>
    );
  }

  if (facts.length === 0) {
    return (
      <div className="rounded-xl border border-white bg-black p-4 text-sm text-zinc-200">
        {profile.displayName} has no saved facts yet.
      </div>
    );
  }

  const width = 860;
  const height = Math.max(
    420,
    facts.length * 96 + 80
  );
  const profileX = 140;
  const profileY = height / 2;
  const factX = 620;
  const firstFactY =
    height / 2 -
    ((facts.length - 1) * 86) / 2;

  return (
    <div className="overflow-auto rounded-xl border border-white bg-gradient-to-br from-black via-zinc-950 to-black p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-h-[360px] w-full min-w-[720px]"
        role="img"
        aria-label={`${profile.displayName} memory network`}
      >
        <defs>
          <filter
            id="memory-node-glow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur
              stdDeviation="5"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {facts.map((_, index) => {
          const y =
            firstFactY + index * 86;
          const controlX =
            profileX +
            (factX - profileX) * 0.52;

          return (
            <g key={`connection-${index}`}>
              <path
                d={[
                  `M ${profileX + 108} ${profileY}`,
                  `C ${controlX} ${profileY}`,
                  `${controlX} ${y}`,
                  `${factX - 130} ${y}`,
                ].join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.48)"
                strokeWidth="2"
              />

              <circle
                cx={controlX}
                cy={(profileY + y) / 2}
                r="4"
                fill="white"
                opacity="0.82"
              />
            </g>
          );
        })}

        <ellipse
          cx={profileX}
          cy={profileY}
          rx="112"
          ry="48"
          fill="#020617"
          stroke="white"
          strokeWidth="2.5"
          filter="url(#memory-node-glow)"
        />

        <foreignObject
          x={profileX - 86}
          y={profileY - 23}
          width="172"
          height="46"
        >
          <div className="flex h-full items-center justify-center px-2 text-center text-base font-extrabold leading-5 text-white">
            {profile.displayName}
          </div>
        </foreignObject>

        {facts.map((fact, index) => {
          const y =
            firstFactY + index * 86;

          return (
            <g key={`node-${index}`}>
              <ellipse
                cx={factX}
                cy={y}
                rx="132"
                ry="42"
                fill="#050505"
                stroke="white"
                strokeWidth="1.5"
              />

              <foreignObject
                x={factX - 108}
                y={y - 28}
                width="216"
                height="56"
              >
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-4 text-white">
                  {fact}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {facts.map((_, index) => {
          const y =
            firstFactY + index * 86;

          return (
            <polygon
              key={`line-${index}`}
              points={`${factX - 138},${y} ${factX - 150},${y - 6} ${factX - 150},${y + 6}`}
              fill="white"
              opacity="0.78"
            />
          );
        })}
      </svg>
    </div>
  );
}


type MemoryDialogProps = {
  activeProfile: UserProfile | null;
  activeProfileSummary: string;
  isOpen: boolean;
  mode: MemoryViewMode;
  onClose: () => void;
  onModeChange: (mode: MemoryViewMode) => void;
};


function MemoryDialog({
  activeProfile,
  activeProfileSummary,
  isOpen,
  mode,
  onClose,
  onModeChange,
}: MemoryDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      toggleDialog={onClose}
    >
      <div className="flex max-h-[85vh] w-[min(92vw,860px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Profile memory
            </h2>

            <p className="mt-1 text-xs text-zinc-300">
              {activeProfile
                ? `Memory saved for ${activeProfile.displayName}.`
                : "No active profile selected."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
            aria-label="Close memory window"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onModeChange(
                "neural_network"
              )
            }
            className={`rounded border px-3 py-1 text-xs font-bold transition ${
              mode ===
              "neural_network"
                ? "border-white bg-white text-black"
                : "border-white bg-black text-white hover:bg-white hover:text-black"
            }`}
          >
            View as a neural network
          </button>

          <button
            type="button"
            onClick={() =>
              onModeChange("basic")
            }
            className={`rounded border px-3 py-1 text-xs font-bold transition ${
              mode === "basic"
                ? "border-white bg-white text-black"
                : "border-white bg-black text-white hover:bg-white hover:text-black"
            }`}
          >
            View basic
          </button>
        </div>

        <div className="min-h-0 overflow-auto">
          {mode ===
          "neural_network" ? (
            <MemoryNetworkView
              profile={activeProfile}
            />
          ) : (
            <div className="rounded-xl border border-white bg-black p-4 text-sm leading-6 text-white">
              {activeProfileSummary}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

type RobotNameDialogProps = {
  isOpen: boolean;
  robotName: string;
  onChangeRobotName: (value: string) => void;
  onClose: () => void;
};


function RobotNameDialog({
  isOpen,
  robotName,
  onChangeRobotName,
  onClose,
}: RobotNameDialogProps) {
  const [draftName, setDraftName] =
    useState(robotName);

  useEffect(() => {
    if (isOpen) {
      setDraftName(robotName);
    }
  }, [isOpen, robotName]);

  const saveName = (): void => {
    const nextName =
      draftName.trim() ||
      "XRP Robot";

    onChangeRobotName(nextName);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      toggleDialog={onClose}
    >
      <div className="flex w-[min(92vw,440px)] flex-col gap-4 bg-black p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Robot name
            </h2>

            <p className="mt-1 text-xs text-zinc-300">
              Choose the name shown in the chat header and robot messages.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
            New robot name
          </label>

          <input
            value={draftName}
            onChange={(event) =>
              setDraftName(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveName();
              }
            }}
            className={`${inputClass} w-full`}
            placeholder="XRP Robot"
          />
        </div>

        <button
          type="button"
          onClick={saveName}
          className={`${buttonClass} w-full`}
        >
          Save robot name
        </button>
      </div>
    </Dialog>
  );
}

type ChatKeywordsDialogProps = {
  chatKeywordEmotion: ChatKeywordEmotionKey;
  chatKeywordPhrase: string;
  chatKeywordReply: string;
  chatKeywordRules: ChatKeywordRule[];
  isOpen: boolean;
  onAddChatKeyword: () => void;
  onChangeEmotion: (value: ChatKeywordEmotionKey) => void;
  onChangePhrase: (value: string) => void;
  onChangeReply: (value: string) => void;
  onClose: () => void;
  onDeleteChatKeyword: (ruleId: string) => void;
};


function ChatKeywordsDialog({
  chatKeywordEmotion,
  chatKeywordPhrase,
  chatKeywordReply,
  chatKeywordRules,
  isOpen,
  onAddChatKeyword,
  onChangeEmotion,
  onChangePhrase,
  onChangeReply,
  onClose,
  onDeleteChatKeyword,
}: ChatKeywordsDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      toggleDialog={onClose}
    >
      <div className="flex max-h-[88vh] w-[min(94vw,860px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Chat keywords
            </h2>

            <p className="mt-1 text-xs text-zinc-300">
              Create simple classroom-safe keyword responses for the robot.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white bg-black px-3 py-1 text-xs font-bold text-white transition hover:bg-white hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 overflow-auto pr-1">
          <div className="grid gap-3 rounded-xl border border-white bg-black p-3">
            <div className="grid gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                IF CHAT CONTAINS
              </label>

              <input
                value={chatKeywordPhrase}
                onChange={(event) =>
                  onChangePhrase(
                    event.target.value
                  )
                }
                className={`${inputClass} w-full`}
                placeholder="Example: Mario Kart"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                EMOTION
              </label>

              <select
                value={chatKeywordEmotion}
                onChange={(event) =>
                  onChangeEmotion(
                    event.target
                      .value as ChatKeywordEmotionKey
                  )
                }
                className={`${inputClass} w-full`}
              >
                {CHAT_KEYWORD_EMOTION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.key}
                      value={option.key}
                      className="bg-black text-white"
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="grid gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                ROBOT REPLY
              </label>

              <textarea
                value={chatKeywordReply}
                onChange={(event) =>
                  onChangeReply(
                    event.target.value
                  )
                }
                className={`${inputClass} min-h-[82px] w-full resize-none`}
                placeholder="Example: I remember Mario Kart matters to you."
              />
            </div>

            <button
              type="button"
              onClick={onAddChatKeyword}
              className={`${buttonClass} w-full`}
            >
              Add chat keyword
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
              Saved chat keywords
            </div>

            {chatKeywordRules.length === 0 ? (
              <div className="rounded-xl border border-white bg-black p-3 text-xs leading-5 text-zinc-300">
                No custom chat keywords yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {chatKeywordRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex min-h-[150px] flex-col justify-between rounded-xl border border-white bg-black p-3 text-xs leading-5 text-white"
                  >
                    <div className="grid gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          Keyword
                        </div>
                        <div className="font-bold">
                          {rule.phrase}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          Emotion
                        </div>
                        <div>
                          {
                            getChatKeywordEmotionOption(
                              rule.emotionKey
                            ).label
                          }
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                          The model responds:
                        </div>
                        <div className="text-zinc-200">
                          {rule.reply ||
                            "No custom reply set."}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onDeleteChatKeyword(
                          rule.id
                        )
                      }
                      className="mt-3 rounded border border-red-400 bg-black px-2 py-1 text-[10px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

type TeacherModeDialogProps = {
  aiResponseMode: AiResponseMode;
  customSafetyTermInput: string;
  geminiApiKey: string;
  geminiModel: string;
  geminiStatus: string;
  isOpen: boolean;
  localLlmEnabled: boolean;
  localLlmModelId: string;
  localLlmRuntime: LocalLlmRuntimeState;
  newTeacherPasscode: string;
  safetyPolicy: ChildSafetyPolicy;
  teacherModeStatus: string;
  teacherPasscodeInput: string;
  teacherUnlocked: boolean;
  onAddCustomSafetyTerm: () => void;
  onChangeAiResponseMode: (mode: AiResponseMode) => void;
  onChangeGeminiApiKey: (value: string) => void;
  onChangeGeminiModel: (value: string) => void;
  onChangeLocalLlmEnabled: (enabled: boolean) => void;
  onChangeNewTeacherPasscode: (value: string) => void;
  onChangeTeacherPasscode: () => void;
  onChangeTeacherPasscodeInput: (value: string) => void;
  onChangeCustomSafetyTermInput: (value: string) => void;
  onClearStatus: () => void;
  onClose: () => void;
  onExportRules: () => void;
  onImportRulesText: (jsonText: string) => void;
  onLoadLocalLlm: () => void;
  onLock: () => void;
  onResetPolicy: () => void;
  onUnlock: () => void;
  onUnloadLocalLlm: () => void;
  onUpdateSafetyPolicy: (policy: ChildSafetyPolicy) => void;
};


function TeacherModeDialog({
  aiResponseMode,
  customSafetyTermInput,
  geminiApiKey,
  geminiModel,
  geminiStatus,
  isOpen,
  localLlmEnabled,
  localLlmModelId,
  localLlmRuntime,
  newTeacherPasscode,
  safetyPolicy,
  teacherModeStatus,
  teacherPasscodeInput,
  teacherUnlocked,
  onAddCustomSafetyTerm,
  onChangeAiResponseMode,
  onChangeGeminiApiKey,
  onChangeGeminiModel,
  onChangeLocalLlmEnabled,
  onChangeNewTeacherPasscode,
  onChangeTeacherPasscode,
  onChangeTeacherPasscodeInput,
  onChangeCustomSafetyTermInput,
  onClearStatus,
  onClose,
  onExportRules,
  onImportRulesText,
  onLoadLocalLlm,
  onLock,
  onResetPolicy,
  onUnlock,
  onUnloadLocalLlm,
  onUpdateSafetyPolicy,
}: TeacherModeDialogProps) {
  const importInputRef =
    useRef<HTMLInputElement>(null);

  const [
    showAllAiModels,
    setShowAllAiModels,
  ] = useState(false);

  const [
    pendingAiResponseMode,
    setPendingAiResponseMode,
  ] = useState<AiResponseMode>(
    aiResponseMode
  );

  const isRecommendedAiMode = (
    mode: AiResponseMode
  ): boolean =>
    mode === "hybrid_local" ||
    mode === "smart_fallback";

  useEffect(() => {
    if (isOpen) {
      setPendingAiResponseMode(
        isRecommendedAiMode(aiResponseMode)
          ? aiResponseMode
          : "hybrid_local"
      );
      setShowAllAiModels(false);
    }
  }, [aiResponseMode, isOpen]);

  const handleToggleAiModelList = (): void => {
    if (showAllAiModels) {
      if (!isRecommendedAiMode(pendingAiResponseMode)) {
        setPendingAiResponseMode("hybrid_local");
      }

      setShowAllAiModels(false);
      return;
    }

    setShowAllAiModels(true);
  };

  const displayedAiModes: AiResponseMode[] =
    showAllAiModels
      ? [
          "local_keywords_only",
          "local_downloaded_model_only",
          "hybrid_local",
          "smart_fallback",
          "rescue_with_gemini",
        ]
      : [
          "hybrid_local",
          "smart_fallback",
        ];

  const selectedModeUsesLocalModel =
    pendingAiResponseMode === "hybrid_local" ||
    pendingAiResponseMode === "local_downloaded_model_only";

  const selectedModeUsesGemini =
    pendingAiResponseMode === "smart_fallback" ||
    pendingAiResponseMode === "rescue_with_gemini";

  const aiModeOptionLabel = (
    mode: AiResponseMode
  ): string => {
    switch (mode) {
      case "local_keywords_only":
        return "Keywords / rules only";
      case "local_downloaded_model_only":
        return "Downloaded local model only (experimental)";
      case "hybrid_local":
        return "Keywords + local model";
      case "smart_fallback":
        return "Keywords + Gemini fallback";
      case "rescue_with_gemini":
        return "Full Gemini";
      default:
        return aiResponseModeLabel(mode);
    }
  };

  const handleImportFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    void file
      .text()
      .then(onImportRulesText);

    event.target.value = "";
  };

  return (
    <Dialog
      isOpen={isOpen}
      toggleDialog={onClose}
    >
      <div className="flex max-h-[88vh] w-[min(94vw,920px)] flex-col gap-4 overflow-hidden bg-black p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Teacher Mode
            </h2>

            <p className="mt-1 text-xs text-zinc-300">
              Protected settings for classroom safety, robot customization, and advanced chat behavior.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-purple-300 bg-purple-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-purple-600"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 overflow-auto pr-1">
          {!teacherUnlocked ? (
            <div className="mx-auto grid max-w-md gap-3 rounded-xl border border-purple-400 bg-purple-950/20 p-4 shadow-[0_0_24px_rgba(168,85,247,0.16)]">
              <div className="rounded-lg border border-purple-300 bg-purple-950/30 p-3 text-xs leading-5 text-purple-50">
                Teacher Mode protects safety rules, chat keywords, Gemini settings, robot name, and profile deletion.
              </div>

              <input
                value={teacherPasscodeInput}
                onChange={(event) =>
                  onChangeTeacherPasscodeInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onUnlock();
                  }
                }}
                className={`${inputClass} w-full`}
                placeholder="Teacher passcode"
                type="password"
              />

              <button
                type="button"
                onClick={onUnlock}
                className="w-full rounded border border-purple-300 bg-purple-700 px-3 py-1 font-bold text-white transition hover:bg-purple-600"
              >
                Unlock Teacher Mode
              </button>

              {teacherModeStatus && (
                <div className="rounded-lg border border-amber-300 bg-amber-950/20 p-2 text-[11px] leading-4 text-amber-50">
                  {teacherModeStatus}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-xl border border-emerald-400 bg-emerald-950/15 p-3 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.12)]">
                <div className="text-xs leading-5">
                  Teacher Mode unlocked. Safety still runs before memory, local ML, Gemini, and custom chat keywords.
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <div className="rounded-lg border border-sky-400 bg-sky-950/20 p-2 text-xs text-sky-50">
                    <span className="font-bold">
                      Actual passcode:
                    </span>{" "}
                    {safetyPolicy.teacherPasscode}
                  </div>

                  <input
                    value={newTeacherPasscode}
                    onChange={(event) =>
                      onChangeNewTeacherPasscode(
                        event.target.value
                      )
                    }
                    className="min-w-0 rounded border border-sky-400 bg-sky-950/20 px-2 py-1 text-xs text-sky-50 placeholder:text-sky-200/60 outline-none focus:ring-2 focus:ring-sky-300 w-full"
                    placeholder="New passcode"
                    type="password"
                  />

                  <button
                    type="button"
                    onClick={onChangeTeacherPasscode}
                    className="rounded border border-sky-300 bg-sky-700 px-3 py-1 font-bold text-white transition hover:bg-sky-600"
                  >
                    Save
                  </button>
                </div>

                <div className="grid gap-3 rounded-lg border border-purple-400 bg-purple-950/20 p-3 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-purple-200">
                      {showAllAiModels
                        ? "All Models"
                        : "Recommended Models"}
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAiModelList}
                      className="rounded border border-purple-300 bg-purple-700 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-purple-600"
                    >
                      {showAllAiModels
                        ? "View recommended models"
                        : "View all available models"}
                    </button>
                  </div>

                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-300 bg-purple-950/20 p-2 text-[10px] leading-4 text-purple-100">
                      <span className="font-bold uppercase tracking-wide text-purple-200">
                        Currently used model
                      </span>

                      <span className="text-right text-purple-50">
                        {aiModeOptionLabel(aiResponseMode)}
                      </span>
                    </div>

                    <label className="text-[10px] font-bold uppercase tracking-wide text-purple-200">
                      AI response mode
                    </label>

                    <select
                      value={pendingAiResponseMode}
                      onChange={(event) =>
                        setPendingAiResponseMode(
                          event.target
                            .value as AiResponseMode
                        )
                      }
                      className="min-w-0 rounded border border-purple-400 bg-purple-950/20 px-2 py-1 text-xs text-purple-50 outline-none focus:ring-2 focus:ring-purple-300 w-full"
                    >
                      {displayedAiModes.map((mode) => (
                        <option
                          key={mode}
                          value={mode}
                          className="bg-black text-white"
                        >
                          {aiModeOptionLabel(mode)}
                        </option>
                      ))}
                    </select>

                    <div className="rounded-lg border border-purple-300 bg-purple-950/20 p-2 text-[10px] leading-4 text-purple-100">
                      Selected mode: {aiModeOptionLabel(pendingAiResponseMode)}.
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onChangeAiResponseMode(
                          pendingAiResponseMode
                        )
                      }
                      disabled={
                        pendingAiResponseMode === aiResponseMode
                      }
                      className="w-fit rounded border border-emerald-300 bg-emerald-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-zinc-500 disabled:bg-zinc-700 disabled:text-zinc-300"
                    >
                      Apply changes
                    </button>
                  </div>

                  {selectedModeUsesLocalModel && (
                    <LocalLlmSettingsPanel
                      enabled={localLlmEnabled}
                      modelId={localLlmModelId}
                      runtime={localLlmRuntime}
                      onChangeEnabled={onChangeLocalLlmEnabled}
                      onLoad={onLoadLocalLlm}
                      onUnload={onUnloadLocalLlm}
                    />
                  )}

                  {selectedModeUsesGemini && (
                    <div className="grid gap-2 rounded-lg border border-purple-300 bg-purple-950/20 p-3 md:grid-cols-2">
                      <input
                        value={geminiModel}
                        onChange={(event) =>
                          onChangeGeminiModel(
                            event.target.value
                          )
                        }
                        className="min-w-0 rounded border border-purple-400 bg-purple-950/20 px-2 py-1 text-xs text-purple-50 placeholder:text-purple-200/60 outline-none focus:ring-2 focus:ring-purple-300 w-full"
                        placeholder="Gemini model, e.g. gemini-2.5-flash"
                      />

                      <input
                        value={geminiApiKey}
                        onChange={(event) =>
                          onChangeGeminiApiKey(
                            event.target.value
                          )
                        }
                        className="min-w-0 rounded border border-purple-400 bg-purple-950/20 px-2 py-1 text-xs text-purple-50 placeholder:text-purple-200/60 outline-none focus:ring-2 focus:ring-purple-300 w-full"
                        placeholder="Gemini API key"
                        type="password"
                      />
                    </div>
                  )}

                  {geminiStatus && (
                    <div className="rounded-lg border border-amber-300 bg-amber-950/20 p-2 text-[10px] leading-4 text-amber-50">
                      {geminiStatus}
                    </div>
                  )}

                  {getProfileSanitizationNotice() && (
                    <div className="rounded-lg border border-amber-300 bg-amber-950/20 p-2 text-[10px] leading-4 text-amber-50">
                      {getProfileSanitizationNotice()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onLock}
                  className="w-fit rounded border border-yellow-300 bg-yellow-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-yellow-600"
                >
                  Lock Teacher Mode
                </button>
              </div>

              <BootSafetyPanel />

              <div
                className="grid gap-3 rounded-xl border p-3"
                style={{
                  backgroundColor: "rgba(67, 20, 7, 0.24)",
                  borderColor: "rgba(251, 146, 60, 0.72)",
                  boxShadow: "0 0 18px rgba(251, 146, 60, 0.08)",
                }}
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: "rgba(124, 45, 18, 0.22)",
                      borderColor: "rgba(253, 186, 116, 0.62)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-amber-100">
                          Exact identical blocked words identified
                        </div>

                        <div className="mt-1 text-[11px] leading-4 text-amber-100/80">
                          Blocks configured exact terms and enabled safety categories before the chat response pipeline continues.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSafetyPolicy({
                            ...safetyPolicy,
                            enabled:
                              !safetyPolicy.enabled,
                          })
                        }
                        className={`rounded border px-3 py-1 text-xs font-bold transition ${
                          safetyPolicy.enabled
                            ? "border-emerald-300 bg-emerald-700 text-white"
                            : "border-rose-300 bg-rose-800 text-white"
                        }`}
                        style={{
                          backgroundColor:
                            safetyPolicy.enabled
                              ? "rgba(4, 120, 87, 0.82)"
                              : "rgba(159, 18, 57, 0.72)",
                          borderColor:
                            safetyPolicy.enabled
                              ? "rgba(110, 231, 183, 0.8)"
                              : "rgba(253, 164, 175, 0.72)",
                          color: "#ffffff",
                        }}
                      >
                        {safetyPolicy.enabled
                          ? "On"
                          : "Off"}
                      </button>
                    </div>
                  </div>

                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: "rgba(124, 45, 18, 0.22)",
                      borderColor: "rgba(253, 186, 116, 0.62)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-amber-100">
                          Synonyms of identical blocked words identified
                        </div>

                        <div className="mt-1 text-[11px] leading-4 text-amber-100/80">
                          Uses fuzzy, semantic, and local classifier checks to catch unsafe paraphrases or related wording.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSafetyPolicy({
                            ...safetyPolicy,
                            semanticClassifierEnabled:
                              !safetyPolicy.semanticClassifierEnabled,
                          })
                        }
                        className={`rounded border px-3 py-1 text-xs font-bold transition ${
                          safetyPolicy.semanticClassifierEnabled
                            ? "border-emerald-300 bg-emerald-700 text-white"
                            : "border-rose-300 bg-rose-800 text-white"
                        }`}
                        style={{
                          backgroundColor:
                            safetyPolicy.semanticClassifierEnabled
                              ? "rgba(4, 120, 87, 0.82)"
                              : "rgba(159, 18, 57, 0.72)",
                          borderColor:
                            safetyPolicy.semanticClassifierEnabled
                              ? "rgba(110, 231, 183, 0.8)"
                              : "rgba(253, 164, 175, 0.72)",
                          color: "#ffffff",
                        }}
                      >
                        {safetyPolicy.semanticClassifierEnabled
                          ? "On"
                          : "Off"}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                    Blocked keyword categories
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {CHILD_SAFETY_CATEGORY_OPTIONS.map(
                      (option) => {
                        const isEnabled =
                          safetyPolicy
                            .enabledCategories[
                            option.key
                          ];

                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() =>
                              onUpdateSafetyPolicy({
                                ...safetyPolicy,
                                enabledCategories: {
                                  ...safetyPolicy.enabledCategories,
                                  [option.key]:
                                    !isEnabled,
                                },
                              })
                            }
                            className={`rounded-lg border p-2 text-left transition ${
                              isEnabled
                                ? "border-amber-300 bg-amber-700 text-white"
                                : "border-rose-400/70 bg-rose-950/20 text-rose-50"
                            }`}
                            style={{
                              backgroundColor:
                                isEnabled
                                  ? "rgba(154, 52, 18, 0.58)"
                                  : "rgba(30, 41, 59, 0.38)",
                              borderColor:
                                isEnabled
                                  ? "rgba(253, 186, 116, 0.72)"
                                  : "rgba(148, 163, 184, 0.55)",
                              color: "#ffffff",
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold">
                                {option.label}
                              </span>

                              <span className="text-[10px] font-bold uppercase">
                                {isEnabled
                                  ? "On"
                                  : "Off"}
                              </span>
                            </div>

                            <div className={`mt-1 text-[10px] leading-4 ${
                              isEnabled
                                ? "text-amber-50"
                                : "text-rose-100/70"
                            }`}>
                              {option.description}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              <div
                className="grid gap-2 rounded-xl border p-3"
                style={{
                  backgroundColor: "rgba(88, 28, 135, 0.2)",
                  borderColor: "rgba(192, 132, 252, 0.68)",
                  boxShadow: "0 0 18px rgba(168, 85, 247, 0.08)",
                }}
              >
                <label className="text-[10px] font-bold uppercase tracking-wide text-purple-200">
                  Custom blocked item
                </label>

                <div className="flex gap-2">
                  <input
                    value={customSafetyTermInput}
                    onChange={(event) =>
                      onChangeCustomSafetyTermInput(
                        event.target.value
                      )
                    }
                    className="min-w-0 flex-1 rounded border border-purple-400 bg-purple-950/20 px-2 py-1 text-xs text-purple-50 placeholder:text-purple-200/60 outline-none focus:ring-2 focus:ring-purple-300"
                    style={{
                      backgroundColor: "rgba(59, 7, 100, 0.34)",
                      borderColor: "rgba(192, 132, 252, 0.68)",
                      color: "#faf5ff",
                    }}
                    placeholder="Example: scary topic"
                  />

                  <button
                    type="button"
                    onClick={onAddCustomSafetyTerm}
                    className="rounded border border-purple-300 bg-purple-700 px-3 py-1 font-bold text-white transition hover:bg-purple-600"
                    style={{
                      backgroundColor: "rgba(126, 34, 206, 0.78)",
                      borderColor: "rgba(216, 180, 254, 0.78)",
                      color: "#ffffff",
                    }}
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {safetyPolicy.customBlockedTerms.length === 0 ? (
                    <div className="text-[11px] text-zinc-400">
                      No custom blocked terms yet.
                    </div>
                  ) : (
                    safetyPolicy.customBlockedTerms.map(
                      (term) => (
                        <span
                          key={term}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-950/40 px-3 py-1 text-[11px] text-rose-50"
                        >
                          {term}

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSafetyPolicy({
                                ...safetyPolicy,
                                customBlockedTerms:
                                  safetyPolicy.customBlockedTerms.filter(
                                    (item) =>
                                      item !== term
                                  ),
                              })
                            }
                            className="font-bold text-red-300 hover:text-red-100"
                          >
                            ×
                          </button>
                        </span>
                      )
                    )
                  )}
                </div>
              </div>

              <div
                className="grid gap-2 rounded-xl border p-3"
                style={{
                  backgroundColor: "rgba(67, 20, 7, 0.22)",
                  borderColor: "rgba(251, 146, 60, 0.68)",
                  boxShadow: "0 0 18px rgba(251, 146, 60, 0.08)",
                }}
              >
                <label className="text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  Safe reply
                </label>

                <textarea
                  value={safetyPolicy.safeReply}
                  onChange={(event) =>
                    onUpdateSafetyPolicy({
                      ...safetyPolicy,
                      safeReply:
                        event.target.value,
                    })
                  }
                  className="min-w-0 min-h-[78px] w-full resize-none rounded border border-amber-400 bg-amber-950/20 px-2 py-1 text-xs text-amber-50 placeholder:text-amber-200/60 outline-none focus:ring-2 focus:ring-amber-300"
                  style={{
                    backgroundColor: "rgba(67, 20, 7, 0.28)",
                    borderColor: "rgba(253, 186, 116, 0.68)",
                    color: "#fffbeb",
                  }}
                />
              </div>

              <div
                className="grid gap-2 rounded-xl border p-3"
                style={{
                  backgroundColor: "rgba(88, 28, 135, 0.2)",
                  borderColor: "rgba(192, 132, 252, 0.68)",
                  boxShadow: "0 0 18px rgba(168, 85, 247, 0.08)",
                }}
              >
                <label className="text-[10px] font-bold uppercase tracking-wide text-purple-200">
                  Import / export safety rules JSON
                </label>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onExportRules}
                    className="rounded border border-cyan-300 bg-cyan-700 px-3 py-1 font-bold text-white transition hover:bg-cyan-600"
                    style={{
                      backgroundColor: "rgba(126, 34, 206, 0.78)",
                      borderColor: "rgba(216, 180, 254, 0.78)",
                      color: "#ffffff",
                    }}
                  >
                    Export rules JSON
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      importInputRef.current?.click()
                    }
                    className="rounded border border-cyan-300 bg-cyan-700 px-3 py-1 font-bold text-white transition hover:bg-cyan-600"
                    style={{
                      backgroundColor: "rgba(126, 34, 206, 0.78)",
                      borderColor: "rgba(216, 180, 254, 0.78)",
                      color: "#ffffff",
                    }}
                  >
                    Import rules JSON
                  </button>
                </div>

                <div className="text-[10px] leading-4 text-purple-100/70">
                  The JSON includes passcode, blocking modes, keyword categories, custom blocked items, and the safe reply.
                </div>
              </div>

              <div
                className="grid grid-cols-2 gap-2 rounded-xl border p-2"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  borderColor: "#94a3b8",
                }}
              >
                <button
                  type="button"
                  onClick={onResetPolicy}
                  className="rounded border border-yellow-300 bg-yellow-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-yellow-600"
                  style={{
                    backgroundColor: "#a16207",
                    borderColor: "#fde047",
                    color: "#ffffff",
                  }}
                >
                  Reset safety policy
                </button>

                <button
                  type="button"
                  onClick={onClearStatus}
                  className="rounded border border-sky-300 bg-sky-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-sky-600"
                  style={{
                    backgroundColor: "#0369a1",
                    borderColor: "#7dd3fc",
                    color: "#ffffff",
                  }}
                >
                  Clear status
                </button>
              </div>

              {teacherModeStatus && (
                <div className="rounded-lg border border-sky-400 bg-sky-950/20 p-2 text-[11px] leading-4 text-sky-50">
                  {teacherModeStatus}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

const RobotChatWidget:
  React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

  const [
    profiles,
    setProfiles,
  ] = useState<UserProfile[]>([]);

  const [
    activeProfile,
    setActiveProfile,
  ] = useState<UserProfile | null>(
    null
  );

  const [
    input,
    setInput,
  ] = useState("");

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>(() => [
    Object.assign({
      id: safeRandomId(),
      role: "robot" as const,
      text: "Hi. You can talk to me or introduce yourself naturally. Example: “Hi im Santiago, I am from Colombia, I study systems engineering, I prefer basketball, and Colombia losing makes me sad.”",
      emotionLabel: "Idle",
      createdAt: nowIso(),
    }, {
        text: replyDisplayName(getActiveUserProfile())
          ? `Hi, ${replyDisplayName(getActiveUserProfile())}! It's good to see you again.`
          : onboardingGreeting(readLocalStorage(ROBOT_NAME_STORAGE_KEY, "XRP Robot")),
        emotionLabel: "Happy",
      }),
  ]);

  const [studentIdentityState, setStudentIdentityState] =
    useState<StudentIdentityState>(() =>
      identityStateForProfile(getActiveUserProfile()) === "known_student"
        ? "known_student"
        : "awaiting_name"
    );

  const messagesRef = useRef(messages);
  const pendingNameRef = useRef<string | null>(null);
  const responseBankRef = useRef(new CompanionResponseBank());
  const activeSendCountRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [
    isRobotTyping,
    setIsRobotTyping,
  ] = useState(false);

  const [
    showMemory,
    setShowMemory,
  ] = useState(false);

  const [
    memoryViewMode,
    setMemoryViewMode,
  ] = useState<MemoryViewMode>(
    "neural_network"
  );

  const [
    showRobotNameDialog,
    setShowRobotNameDialog,
  ] = useState(false);

  const [
    aiResponseMode,
    setAiResponseMode,
  ] = useState<AiResponseMode>(
    () => readInitialAiResponseMode()
  );

  const [
    geminiApiKey,
    setGeminiApiKey,
  ] = useState(
    () =>
      readLocalStorage(
        GEMINI_API_KEY_STORAGE_KEY,
        ""
      )
  );

  const [
    geminiModel,
    setGeminiModel,
  ] = useState(
    () =>
      readLocalStorage(
        GEMINI_MODEL_STORAGE_KEY,
        "gemini-2.5-flash"
      )
  );

  const [
    geminiStatus,
    setGeminiStatus,
  ] = useState("");

  const [
    ,
    setResponseDebug,
  ] = useState<RobotResponseDebug | null>(
    null
  );

  const [
    localLlmEnabled,
    setLocalLlmEnabled,
  ] = useState(
    () =>
      readLocalStorage(
        LOCAL_LLM_ENABLED_STORAGE_KEY,
        "false"
      ) === "true"
  );

  const [
    localLlmModelId,
  ] = useState(
    () =>
      readLocalStorage(
        LOCAL_LLM_MODEL_STORAGE_KEY,
        DEFAULT_LOCAL_LLM_MODEL_ID
      )
  );

  const [
    localLlmRuntime,
    setLocalLlmRuntime,
  ] = useState<LocalLlmRuntimeState>(
    () => initialLocalLlmRuntimeState(
      readLocalStorage(
        LOCAL_LLM_MODEL_STORAGE_KEY,
        DEFAULT_LOCAL_LLM_MODEL_ID
      )
    )
  );

  const [
    robotName,
    setRobotName,
  ] = useState(
    () =>
      readLocalStorage(
        ROBOT_NAME_STORAGE_KEY,
        "XRP Robot"
      )
  );

  const [
    showChatKeywords,
    setShowChatKeywords,
  ] = useState(false);

  const [
    chatKeywordRules,
    setChatKeywordRules,
  ] = useState<ChatKeywordRule[]>(
    () => getChatKeywordRules()
  );

  const [
    chatKeywordPhrase,
    setChatKeywordPhrase,
  ] = useState("");

  const [
    chatKeywordEmotion,
    setChatKeywordEmotion,
  ] = useState<ChatKeywordEmotionKey>("happy");

  const [
    chatKeywordReply,
    setChatKeywordReply,
  ] = useState("");

  const [
    showTeacherMode,
    setShowTeacherMode,
  ] = useState(false);

  const [
    teacherUnlocked,
    setTeacherUnlocked,
  ] = useState(false);

  const [
    teacherPasscodeInput,
    setTeacherPasscodeInput,
  ] = useState("");

  const [
    newTeacherPasscode,
    setNewTeacherPasscode,
  ] = useState("");

  const [
    teacherModeStatus,
    setTeacherModeStatus,
  ] = useState("");

  const [
    safetyPolicy,
    setSafetyPolicy,
  ] = useState<ChildSafetyPolicy>(
    () => getChildSafetyPolicy()
  );

  const [
    customSafetyTermInput,
    setCustomSafetyTermInput,
  ] = useState("");

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const localLlmAdapterRef =
    useRef<LocalLlmChatAdapter | null>(null);

  if (!localLlmAdapterRef.current) {
    localLlmAdapterRef.current =
      new LocalLlmChatAdapter();
  }

  const faceGreetingTimestampsRef =
    useRef<Map<string, number>>(
      new Map()
    );

  const lastUserChatActivityAtRef =
    useRef(0);

  const greetedCameraSessionsRef =
    useRef<Set<string>>(
      new Set()
    );

  const refreshProfiles = (): void => {
    setProfiles(
      getUserProfiles()
    );

    setActiveProfile(
      getActiveUserProfile()
    );
  };

  useEffect(() => {
    refreshProfiles();

    const handleChanged = (): void => {
      refreshProfiles();
    };

    window.addEventListener(
      USER_PROFILE_CHANGED_EVENT,
      handleChanged
    );

    window.addEventListener(
      "storage",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        USER_PROFILE_CHANGED_EVENT,
        handleChanged
      );

      window.removeEventListener(
        "storage",
        handleChanged
      );
    };
  }, []);

  useEffect(() => {
    writeLocalStorage(
      AI_RESPONSE_MODE_STORAGE_KEY,
      aiResponseMode
    );
  }, [aiResponseMode]);

  useEffect(() => {
    writeLocalStorage(
      GEMINI_API_KEY_STORAGE_KEY,
      geminiApiKey
    );
  }, [geminiApiKey]);

  useEffect(() => {
    writeLocalStorage(
      GEMINI_MODEL_STORAGE_KEY,
      geminiModel
    );
  }, [geminiModel]);

  useEffect(() => {
    writeLocalStorage(
      LOCAL_LLM_ENABLED_STORAGE_KEY,
      String(localLlmEnabled)
    );
  }, [localLlmEnabled]);

  useEffect(() => {
    writeLocalStorage(
      LOCAL_LLM_MODEL_STORAGE_KEY,
      localLlmModelId
    );
  }, [localLlmModelId]);

  useEffect(() => {
    const adapter =
      localLlmAdapterRef.current;

    if (!adapter) {
      return;
    }

    const unsubscribe =
      adapter.subscribe(
        setLocalLlmRuntime
      );

    return () => {
      unsubscribe();
      adapter.dispose();
    };
  }, []);

  useEffect(() => {
    writeLocalStorage(
      ROBOT_NAME_STORAGE_KEY,
      robotName
    );
  }, [robotName]);

  useEffect(() => {
    const handleChanged = (): void => {
      setChatKeywordRules(
        getChatKeywordRules()
      );
    };

    window.addEventListener(
      CHAT_KEYWORDS_CHANGED_EVENT,
      handleChanged
    );

    window.addEventListener(
      "storage",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        CHAT_KEYWORDS_CHANGED_EVENT,
        handleChanged
      );

      window.removeEventListener(
        "storage",
        handleChanged
      );
    };
  }, []);

  useEffect(() => {
    const handleChanged = (): void => {
      setSafetyPolicy(
        getChildSafetyPolicy()
      );
    };

    window.addEventListener(
      SAFETY_POLICY_CHANGED_EVENT,
      handleChanged
    );

    window.addEventListener(
      "storage",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        SAFETY_POLICY_CHANGED_EVENT,
        handleChanged
      );

      window.removeEventListener(
        "storage",
        handleChanged
      );
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const activeProfileSummary =
    useMemo(() => {
      if (!activeProfile) {
        return "No active profile yet.";
      }

      return summarizeUserProfile(
        activeProfile
      );
    }, [activeProfile]);

  const updateSafetyPolicy = (
    nextPolicy: ChildSafetyPolicy
  ): void => {
    saveChildSafetyPolicy(
      nextPolicy
    );

    setSafetyPolicy(
      getChildSafetyPolicy()
    );
  };


  const handleTeacherUnlock = (): void => {
    if (
      verifyTeacherPasscode(
        teacherPasscodeInput,
        safetyPolicy
      )
    ) {
      setTeacherUnlocked(true);
      setTeacherModeStatus(
        "Teacher Mode unlocked."
      );
      setTeacherPasscodeInput("");
      return;
    }

    setTeacherModeStatus(
      "Incorrect passcode."
    );
  };


  const handleAddCustomSafetyTerm = (): void => {
    const term =
      customSafetyTermInput.trim();

    if (!term) {
      return;
    }

    updateSafetyPolicy({
      ...safetyPolicy,
      customBlockedTerms: [
        term,
        ...safetyPolicy.customBlockedTerms.filter(
          (item) =>
            item.toLowerCase() !==
            term.toLowerCase()
        ),
      ],
    });

    setCustomSafetyTermInput("");
  };


  const handleImportSafetyRules = (
    jsonText: string
  ): void => {
    try {
      const imported =
        importChildSafetyPolicyJson(
          jsonText,
          safetyPolicy
        );

      updateSafetyPolicy(imported);
      setTeacherModeStatus(
        "Safety rules imported."
      );
    } catch {
      setTeacherModeStatus(
        "Invalid safety rules JSON."
      );
    }
  };


  const handleExportSafetyRules = (): void => {
    const jsonText =
      exportChildSafetyPolicyJson(
        safetyPolicy
      );

    const blob =
      new Blob([jsonText], {
        type: "application/json",
      });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "xrp-child-safety-rules.json";
    link.click();

    URL.revokeObjectURL(url);

    setTeacherModeStatus(
      "Safety rules JSON downloaded."
    );
  };


  const handleChangeTeacherPasscode = (): void => {
    const nextPasscode =
      newTeacherPasscode.trim();

    if (nextPasscode.length < 4) {
      setTeacherModeStatus(
        "Passcode must be at least 4 characters."
      );
      return;
    }

    updateSafetyPolicy({
      ...safetyPolicy,
      teacherPasscode:
        nextPasscode,
    });

    setNewTeacherPasscode("");
    setTeacherModeStatus(
      "Teacher passcode updated."
    );
  };


  const handleAddChatKeyword = (): void => {
    const phrase =
      chatKeywordPhrase.trim();

    if (!phrase) {
      return;
    }

    const safetyResult =
      checkChildSafety(
        `${phrase} ${chatKeywordReply}`,
        safetyPolicy
      );

    if (!safetyResult.allowed) {
      setTeacherModeStatus(
        `Chat keyword blocked by safety filter: ${safetyResult.reason}`
      );
      return;
    }

    upsertChatKeywordRule({
      phrase,
      emotionKey:
        chatKeywordEmotion,
      reply:
        chatKeywordReply,
      priority: 90,
      enabled: true,
    });

    setChatKeywordPhrase("");
    setChatKeywordReply("");
    setChatKeywordEmotion("happy");
    setChatKeywordRules(
      getChatKeywordRules()
    );
  };


  const handleLoadLocalLlm = async (): Promise<void> => {
    try {
      await localLlmAdapterRef.current?.load(
        localLlmModelId
      );
    } catch {
      // The adapter exposes the actionable error in Teacher Mode.
    }
  };


  const handleUnloadLocalLlm = (): void => {
    localLlmAdapterRef.current?.unload();
  };

  const handleSend = async (
    overrideInput?: string
  ): Promise<void> => {
    const rawInput =
      (overrideInput ?? input).trim();

    const clean =
      normalizeChatInputForReasoning(
        rawInput
      );

    if (!rawInput || !clean) {
      return;
    }

    const messageSnapshot = messagesRef.current;
    const deterministicIntent = detectStudentIntent(clean);

    lastUserChatActivityAtRef.current =
      Date.now();

    const safetyResult =
      checkChildSafety(
        clean,
        safetyPolicy
      );

    const understandingResult = separateSafetyFromUnderstanding(
      safetyResult.allowed,
      deterministicIntent
    );

    if (!safetyResult.allowed) {
      const safetyDecision:
        ChatEmotionDecision = {
          emotionId:
            EMOTION_IDLE_ID,
          emotionLabel:
            "Idle",
          confidence:
            0.99,
          reason:
            safetyResult.reason,
        };

      const nextMessages:
        ChatMessage[] = [
          ...messageSnapshot,
          {
            id: safeRandomId(),
            role: "user",
            text: rawInput,
            createdAt: nowIso(),
          },
          {
            id: safeRandomId(),
            role: "robot",
            text: safetyResult.safeReply,
            emotionLabel:
              safetyDecision.emotionLabel,
            createdAt: nowIso(),
          },
        ];

      setMessages(
        nextMessages
      );
      messagesRef.current = nextMessages;

      setInput("");

      setResponseDebug({
        source: "safety",
        localModelCalled: false,
        mode: aiResponseModeLabel(aiResponseMode),
        detectedIntent: deterministicIntent.intent,
        studentEmotion: deterministicIntent.studentEmotion,
        emotionConfidence: deterministicIntent.confidence,
        responseCategory: deterministicIntent.responseCategory,
        identityState: studentIdentityState,
        profileCandidates: [],
        acceptedProfileUpdates: [],
        rejectedProfileUpdates: [],
        clarificationRequested: false,
        lightweightClassifierUsed: false,
        qwenParseStatus: "not called",
        geminiCalled: false,
        safetyResult: "restricted",
        unsupportedIntent: understandingResult.unsupportedIntent,
      });

      emitDashboardEmotionPreview(
        safetyDecision,
        clean
      );

      return;
    }

    const identityProfileBefore = getActiveUserProfile();
    const existingName = replyDisplayName(identityProfileBefore);
    if (studentIdentityState === "awaiting_name_confirmation" && pendingNameRef.current) {
      const confirmed = isAffirmativeNameConfirmation(clean);
      const rejected = isNegativeNameConfirmation(clean);
      if (confirmed || rejected) {
        const candidate = pendingNameRef.current;
        pendingNameRef.current = null;
        const updatedProfile = confirmed ? upsertUserProfile(candidate) : identityProfileBefore;
        if (confirmed && updatedProfile) setActiveUserProfileId(updatedProfile.id);
        const nextState: StudentIdentityState = updatedProfile && replyDisplayName(updatedProfile)
          ? "known_student"
          : "awaiting_name";
        setStudentIdentityState(nextState);
        const confirmationReply = confirmed
          ? `Thanks! I'll call you ${candidate}.`
          : existingName
            ? `Okay. I will keep using ${existingName}.`
            : "No problem - what should I call you?";
        const next: ChatMessage[] = [
          ...messageSnapshot,
          { id: safeRandomId(), role: "user", text: rawInput, createdAt: nowIso() },
          { id: safeRandomId(), role: "robot", text: confirmationReply, emotionLabel: "Happy", createdAt: nowIso() },
        ];
        messagesRef.current = next;
        setMessages(next);
        setInput("");
        setResponseDebug({
          source: "profile parser", localModelCalled: false, mode: aiResponseModeLabel(aiResponseMode),
          detectedIntent: "clarification_answer", studentEmotion: "neutral", emotionConfidence: 0.99,
          responseCategory: "profile_acknowledgement", identityState: nextState,
          profileCandidates: [`name: ${candidate}`], acceptedProfileUpdates: confirmed ? [`name: ${candidate}`] : [],
          rejectedProfileUpdates: rejected ? [`name: ${candidate}`] : [], clarificationRequested: false,
          lightweightClassifierUsed: false, qwenParseStatus: "not called", geminiCalled: false,
          safetyResult: "safe", unsupportedIntent: false,
        });
        refreshProfiles();
        return;
      }

      const candidate = pendingNameRef.current;
      const next: ChatMessage[] = [
        ...messageSnapshot,
        { id: safeRandomId(), role: "user", text: rawInput, createdAt: nowIso() },
        { id: safeRandomId(), role: "robot", text: `Please answer yes or no: should I call you ${candidate}?`, emotionLabel: "Idle", createdAt: nowIso() },
      ];
      messagesRef.current = next;
      setMessages(next);
      setInput("");
      setResponseDebug({
        source: "profile parser", localModelCalled: false, mode: aiResponseModeLabel(aiResponseMode),
        detectedIntent: "clarification_answer", studentEmotion: "neutral", emotionConfidence: 0.9,
        responseCategory: "clarification", identityState: "awaiting_name_confirmation",
        profileCandidates: [`name: ${candidate}`], acceptedProfileUpdates: [], rejectedProfileUpdates: [],
        clarificationRequested: true, lightweightClassifierUsed: false, qwenParseStatus: "not called",
        geminiCalled: false, safetyResult: "safe", unsupportedIntent: false,
      });
      return;
    }

    const contextualName = extractContextualNameCandidate(clean, studentIdentityState, existingName);
    const shouldConfirmNewName =
      Boolean(contextualName.candidate) &&
      !existingName &&
      (studentIdentityState === "unknown_student" || studentIdentityState === "awaiting_name");
    const shouldConfirmNameChange =
      Boolean(contextualName.candidate) &&
      contextualName.requiresConfirmation;

    if (contextualName.candidate && (shouldConfirmNewName || shouldConfirmNameChange)) {
      pendingNameRef.current = contextualName.candidate;
      setStudentIdentityState("awaiting_name_confirmation");
      const next: ChatMessage[] = [
        ...messageSnapshot,
        { id: safeRandomId(), role: "user", text: rawInput, createdAt: nowIso() },
        { id: safeRandomId(), role: "robot", text: nameConfirmationPrompt(contextualName.candidate), emotionLabel: "Idle", createdAt: nowIso() },
      ];
      messagesRef.current = next;
      setMessages(next);
      setInput("");
      setResponseDebug({
        source: "profile parser", localModelCalled: false, mode: aiResponseModeLabel(aiResponseMode),
        detectedIntent: "self_introduction", studentEmotion: "neutral", emotionConfidence: 0.99,
        responseCategory: "clarification", identityState: "awaiting_name_confirmation",
        profileCandidates: [`name: ${contextualName.candidate}`], acceptedProfileUpdates: [], rejectedProfileUpdates: [],
        clarificationRequested: true, lightweightClassifierUsed: false, qwenParseStatus: "not called",
        geminiCalled: false, safetyResult: "safe", unsupportedIntent: false,
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: safeRandomId(),
      role: "user",
      text: rawInput,
      createdAt: nowIso(),
    };

    const messagesWithUser: ChatMessage[] = [
      ...messageSnapshot,
      userMessage,
    ];

    setMessages(messagesWithUser);
    messagesRef.current = messagesWithUser;
    setInput("");
    activeSendCountRef.current += 1;
    setIsRobotTyping(true);

    const profileBefore =
      getActiveUserProfile();

    const activeProfileId =
      getActiveUserProfileId();

    const parsed =
      parseProfileText(clean, {
        allowImplicitName:
          !existingName &&
          (studentIdentityState === "unknown_student" || studentIdentityState === "awaiting_name"),
        knownDisplayName: existingName,
      });

    const keywordMatch =
      findMatchingCustomEmotionKeyword(
        clean
      );

    const chatKeywordMatch =
      findMatchingChatKeyword(
        clean
      );

    const localSocialReasoning =
      inferLocalSocialReasoning({
        text:
          clean,
        profile:
          profileBefore,
        parsedMemoryItems:
          parsed.memoryItems,
      });

    const localMlEmotion =
      classifyLocalEmotion(clean);

    const localEmpathy =
      inferLocalEmpathy(
        clean,
        replyDisplayName(profileBefore)
      );

    const isSmallTalk =
      isSimpleGreetingOrSmallTalk(clean);

    const preliminaryMemoryAnswer =
      buildMemoryQuestionReply(
        clean,
        profileBefore
      );

    let profileAfter:
      UserProfile | null =
      profileBefore;

    let decision:
      ChatEmotionDecision = {
        emotionId:
          EMOTION_IDLE_ID,
        emotionLabel:
          "Idle",
        confidence:
          0.35,
        reason:
          "Safe fallback before the chat reasoning layer selects a stronger emotion.",
      };

    let robotReply =
      "I am listening.";

    let responseSource:
      RobotResponseSource =
        "fallback";

    const contextualProfile = contextualName.candidate
      ? upsertUserProfile(contextualName.candidate)
      : null;

    const learnedProfile = contextualProfile ??
      learnFromProfileText(
        clean,
        activeProfileId ?? undefined,
        {
          allowImplicitName:
            !existingName &&
            (studentIdentityState === "unknown_student" || studentIdentityState === "awaiting_name"),
          knownDisplayName: existingName,
        }
      );

    if (learnedProfile) {
      setActiveUserProfileId(
        learnedProfile.id
      );
      if (replyDisplayName(learnedProfile)) {
        setStudentIdentityState("known_student");
      }
    }

    profileAfter =
      learnedProfile ??
      getActiveUserProfile();

    const memoryAnswer =
      buildMemoryQuestionReply(
        clean,
        profileAfter ?? profileBefore
      );

    const hasStrongSocialAnswer =
      shouldPreferLocalSocialReasoning(
        localSocialReasoning
      ) && Boolean(localSocialReasoning.reply);

    const hasStrongEmpathyAnswer =
      shouldPreferLocalEmpathy(
        localEmpathy
      );

    decision =
      parsed.clarification
        ? {
            emotionId:
              EMOTION_IDLE_ID,
            emotionLabel:
              "Idle",
            confidence:
              0.82,
            reason:
              "The profile parser found an ambiguous personal statement and asked for clarification.",
          }
        : chatKeywordMatch
        ? {
            emotionId:
              getChatKeywordEmotionOption(
                chatKeywordMatch.rule.emotionKey
              ).emotionId,
            emotionLabel:
              getChatKeywordEmotionOption(
                chatKeywordMatch.rule.emotionKey
              ).label,
            confidence:
              chatKeywordMatch.rule.priority / 100,
            reason:
              `Custom chat keyword "${chatKeywordMatch.rule.phrase}" matched this chat message.`,
          }
        : keywordMatch
          ? {
              emotionId:
                keywordMatch.rule.emotionId,
              emotionLabel:
                getEmotionOptionByKey(
                  keywordMatch.rule.emotionKey
                ).label,
              confidence:
                keywordMatch.rule.priority / 100,
              reason:
                `Custom keyword "${keywordMatch.rule.phrase}" matched this chat message.`,
            }
          : memoryAnswer
          ? {
              emotionId:
                EMOTION_IDLE_ID,
              emotionLabel:
                "Idle",
              confidence:
                0.70,
              reason:
                "The user asked a memory question, so the robot answered from saved profile memory.",
            }
          : isSmallTalk
            ? {
                emotionId:
                  EMOTION_HAPPY_ID,
                emotionLabel:
                  "Happy",
                confidence:
                  0.72,
                reason:
                  "The user sent a greeting or small-talk message.",
              }
            : hasStrongSocialAnswer
              ? localSocialReasoning.decision
              : hasStrongEmpathyAnswer
                ? localEmpathy.decision
                : shouldPreferLocalMlEmotion(
                    localMlEmotion
                  )
                  ? {
                      emotionId:
                        localMlEmotion.emotionId,
                      emotionLabel:
                        localMlEmotion.emotionLabel,
                      confidence:
                        localMlEmotion.confidence,
                      reason:
                        localMlEmotion.reason,
                    }
                  : inferLocalEmotion(
                      clean,
                      profileAfter
                    );

    robotReply =
      parsed.clarification
        ? parsed.clarification
        : chatKeywordMatch
        ? (
            chatKeywordMatch.rule.reply ||
            `I matched "${chatKeywordMatch.rule.phrase}", so I changed my emotion to ${decision.emotionLabel}.`
          )
        : keywordMatch
          ? buildRobotReply(
              clean,
              profileBefore,
              profileAfter,
              parsed.memoryItems,
              decision,
              keywordMatch.rule.phrase
            )
          : memoryAnswer
            ? memoryAnswer
            : isSmallTalk
              ? smallTalkReply(
                  clean,
                  robotName,
                  replyDisplayName(profileAfter) ??
                    replyDisplayName(profileBefore)
                )
              : hasStrongSocialAnswer
                ? localSocialReasoning.reply ?? "I am listening."
                : hasStrongEmpathyAnswer
                  ? localEmpathy.reply
                  : shouldPreferLocalMlEmotion(
                      localMlEmotion
                    )
                    ? localMlEmpathyReply(
                        localMlEmotion,
                        replyDisplayName(profileAfter) ??
                          replyDisplayName(profileBefore)
                      )
                    : buildRobotReply(
                        clean,
                        profileBefore,
                        profileAfter,
                        parsed.memoryItems,
                        decision
                      );

    responseSource =
      parsed.clarification
        ? "profile parser"
        : chatKeywordMatch || keywordMatch
          ? "custom keyword"
          : memoryAnswer ||
            preliminaryMemoryAnswer ||
            parsed.displayName ||
            parsed.memoryItems.length > 0
            ? "memory"
            : isSmallTalk
              ? "small talk"
              : hasStrongSocialAnswer
                ? "social reasoning"
                : hasStrongEmpathyAnswer
                  ? "empathy"
                  : shouldPreferLocalMlEmotion(
                      localMlEmotion
                    )
                    ? "local rules"
                    : "fallback";

    let responseCategory: ResponseCategory = parsed.clarification
      ? "clarification"
      : deterministicIntent.responseCategory;

    const storedNewFacts = Boolean(
      profileAfter &&
      (
        !profileBefore ||
        profileAfter.id !== profileBefore.id ||
        profileAfter.memoryItems.length > profileBefore.memoryItems.length
      )
    );

    if (!chatKeywordMatch && !keywordMatch && !memoryAnswer) {
      if (parsed.clarification) {
        responseCategory = "clarification";
      } else if (contextualName.candidate && profileAfter) {
        robotReply = `Nice to meet you, ${contextualName.candidate}!`;
        responseSource = "onboarding";
        responseCategory = "profile_acknowledgement";
      } else if (parsed.memoryItems.length > 0) {
        responseCategory = parsed.memoryItems.some((item) => item.kind === "preference")
          ? "preference_acknowledgement"
          : "profile_acknowledgement";
        robotReply = responseBankRef.current.select(responseCategory, {
          studentName: replyDisplayName(profileAfter),
          factStored: storedNewFacts,
          factValue: parsed.memoryItems.map(memoryItemAsUserPhrase).join("; "),
        });
        responseSource = "response bank";
      } else if (
        deterministicIntent.intent === "wellbeing_question" ||
        deterministicIntent.intent === "robot_identity_question" ||
        deterministicIntent.intent === "farewell" ||
        deterministicIntent.intent === "general_question" ||
        deterministicIntent.intent === "emotional_disclosure"
      ) {
        robotReply = responseBankRef.current.select(responseCategory, {
          robotName,
          studentName: replyDisplayName(profileAfter),
        });
        responseSource = "response bank";
      } else if (deterministicIntent.intent === "greeting") {
        robotReply = responseBankRef.current.select("greeting", {
          robotName,
          studentName: replyDisplayName(profileAfter),
        });
        responseSource = "response bank";
        responseCategory = "greeting";
      } else if (isWeakLocalReply(robotReply, decision)) {
        robotReply = responseBankRef.current.select("safe_fallback");
        responseSource = "safe fallback";
        responseCategory = "safe_fallback";
      }
    }

    if (
      didNormalizeChatInput(
        rawInput,
        clean
      ) &&
      !chatKeywordMatch
    ) {
      robotReply =
        `${robotReply} I interpreted your message as: "${clean}".`;
    }

    const downloadedModelOnly =
      aiResponseMode ===
      "local_downloaded_model_only";

    if (downloadedModelOnly) {
      decision = {
        emotionId:
          EMOTION_IDLE_ID,
        emotionLabel:
          "Idle",
        confidence:
          0.35,
        reason:
          "Downloaded-model-only mode is selected, so classic local chat responses are not used.",
      };

      robotReply =
        localLlmEnabled
          ? localLlmRuntime.phase === "ready"
            ? "I am thinking."
            : "My downloaded chat model is not ready yet. Please ask a teacher to load it in Teacher Mode."
          : "Downloaded chat model mode is selected, but the model is turned off in Teacher Mode.";
      responseSource =
        "fallback";
    }

    const exactAnswerContext = {
      hasExactCustomAnswer:
        Boolean(keywordMatch) ||
        Boolean(chatKeywordMatch),
      hasMemoryAnswer:
        Boolean(preliminaryMemoryAnswer) ||
        Boolean(memoryAnswer) ||
        Boolean(parsed.displayName) ||
        Boolean(parsed.clarification) ||
        parsed.memoryItems.length > 0,
      isSmallTalk,
      isFacialGreeting: false,
      isMovementCommand: false,
    };

    const protectedExactAnswer =
      hasProtectedExactLocalAnswer(
        exactAnswerContext
      );

    let localLlmProducedStrongAnswer = false;
    let localLlmOutputWasBlocked = false;
    let localLlmWasAttempted = false;
    let qwenRequestId: string | undefined;
    let qwenParseStatus = "not called";
    let semanticAnalysis: LocalSemanticAnalysis | null = null;

    if (
      shouldAttemptLocalLlm({
        mode:
          aiResponseMode,
        inputAllowed: true,
        ...exactAnswerContext,
        hasStrongSocialAnswer,
        hasStrongEmpathyAnswer,
        localReplyIsWeak:
          responseCategory === "safe_fallback" ||
          (
            deterministicIntent.confidence < 0.75 &&
            isWeakLocalReply(robotReply, decision)
          ),
        localLlmEnabled,
        localLlmReady:
          localLlmRuntime.phase === "ready",
      })
    ) {
      localLlmWasAttempted = true;

      try {
        const promptInput = {
              robotName,
              profileFields:
                localLlmProfileFields(
                  profileAfter ?? profileBefore
                ),
              memoryItems:
                profileMemoryFacts(
                  profileAfter ?? profileBefore
                ),
              recentMessages:
                messageSnapshot.map((message) => ({
                  role: message.role,
                  text: message.text,
                })),
              studentMessage: clean,
            };

        if (!downloadedModelOnly) {
          const analysis = await localLlmAdapterRef.current?.analyze(
            buildLocalSemanticMessages({
              profileFields: promptInput.profileFields,
              recentMessages: promptInput.recentMessages,
              studentMessage: clean,
            })
          );

          if (analysis) {
            semanticAnalysis = analysis;
            qwenRequestId = analysis.requestId;
            qwenParseStatus = "valid semantic JSON";
            decision = emotionDecisionFromSemantic(analysis);
            responseCategory = analysis.needsClarification
              ? "clarification"
              : analysis.responseCategory;
            robotReply = responseBankRef.current.select(responseCategory, {
              robotName,
              studentName: replyDisplayName(profileAfter ?? profileBefore),
              clarificationQuestion: analysis.clarificationQuestion,
            });
            responseSource = "local semantic model";
            localLlmProducedStrongAnswer = analysis.confidence >= 0.55;

            if (!analysis.needsClarification && !parsed.clarification && profileAfter) {
              const validatedCandidateItems = analysis.candidateProfileFacts
                .map((candidate) => createMemoryItemFromSemanticCandidate(candidate, clean))
                .filter((item): item is UserMemoryItem => item !== null);
              if (validatedCandidateItems.length > 0) {
                profileAfter = addMemoryItemsToUserProfile(
                  profileAfter.id,
                  validatedCandidateItems
                ) ?? profileAfter;
              }
            }
          }
        }

        const localResponse = downloadedModelOnly
          ? await localLlmAdapterRef.current?.generate(buildLocalLlmMessages(promptInput))
          : undefined;

        if (localResponse) {
          qwenRequestId = localResponse.requestId;
          qwenParseStatus = "valid conversational response";
          const localDecision =
            emotionDecisionFromLocalLlm(
              localResponse
            );

          const localOutputSafety =
            checkChildSafety(
              localResponse.reply,
              safetyPolicy
            );

          const safeLocalOutput =
            applyGeneratedReplySafety(
              localResponse.reply,
              safetyPolicy.safeReply,
              localOutputSafety.allowed
            );

          robotReply = safeLocalOutput.reply;
          localLlmOutputWasBlocked =
            safeLocalOutput.blocked;
          responseSource =
            safeLocalOutput.blocked
              ? "safety"
              : "local conversational model";

          if (safeLocalOutput.blocked) {
            decision = {
              emotionId: EMOTION_IDLE_ID,
              emotionLabel: "Idle",
              confidence: 0.99,
              reason:
                `Browser-local reply blocked before display: ${localOutputSafety.reason}`,
            };
            setGeminiStatus(
              "Browser-local response was blocked by child safety and replaced with the safe reply."
            );
          } else {
            decision = localDecision;
            localLlmProducedStrongAnswer =
              localResponse.confidence >= 0.5 &&
              !isWeakLocalReply(
                localResponse.reply,
                localDecision
              );
            setGeminiStatus(
              localLlmProducedStrongAnswer
                ? "Browser-local model answered; Gemini was not needed."
                : "Browser-local model returned a weak answer."
            );
          }
        } else if (downloadedModelOnly) {
          robotReply =
            "I could not get a local model response yet. Please try again in a moment.";
          responseSource =
            "fallback";

          decision = {
            emotionId:
              EMOTION_IDLE_ID,
            emotionLabel:
              "Idle",
            confidence:
              0.45,
            reason:
              "Downloaded-model-only mode did not receive a browser-local response.",
          };

          setGeminiStatus(
            "Browser-local model did not return a response."
          );
        }
      } catch (error) {
        qwenParseStatus = error instanceof Error
          ? `failed: ${error.message}`
          : "failed";
        if (downloadedModelOnly) {
          robotReply =
            "I had trouble using my downloaded chat model. Please try again in a moment.";
          responseSource =
            "fallback";

          decision = {
            emotionId:
              EMOTION_IDLE_ID,
            emotionLabel:
              "Idle",
            confidence:
              0.45,
            reason:
              "Downloaded-model-only generation failed before the robot could answer.",
          };
        }

        setGeminiStatus(
          error instanceof Error
            ? `Browser-local generation failed: ${error.message}`
            : "Browser-local generation failed."
        );
      }
    } else if (
      aiResponseMode !==
        "local_keywords_only" &&
      localLlmEnabled &&
      localLlmRuntime.phase !== "ready" &&
      isWeakLocalReply(robotReply, decision) &&
      !protectedExactAnswer
    ) {
      setGeminiStatus(
        "Local chat model is enabled but not ready. Load it in Teacher Mode to use browser-local responses."
      );
    }

    const finalLocalReplyIsWeak =
      !localLlmOutputWasBlocked &&
      !(
        deterministicIntent.confidence >= 0.75 &&
        responseCategory !== "safe_fallback"
      ) &&
      (
        isWeakLocalReply(
          robotReply,
          decision
        ) ||
        (
          localLlmWasAttempted &&
          !localLlmProducedStrongAnswer
        )
      );

    let geminiWasAttempted = false;

    if (
      shouldAttemptGemini({
        mode: aiResponseMode,
        inputAllowed: true,
        hasApiKey:
          geminiApiKey.trim().length > 0,
        hasProtectedExactAnswer:
          protectedExactAnswer ||
          localLlmOutputWasBlocked,
        hasStrongLocalAnswer:
          hasStrongSocialAnswer ||
          hasStrongEmpathyAnswer ||
          localLlmProducedStrongAnswer,
        finalLocalReplyIsWeak,
      })
    ) {
      geminiWasAttempted = true;
      setGeminiStatus(
        aiResponseMode === "rescue_with_gemini"
          ? "Rescuing the weak local reply with Gemini..."
          : "Using Gemini after local layers remained weak..."
      );

      try {
        const geminiResponse =
          await askGeminiRobotChat({
            apiKey:
              geminiApiKey,
            model:
              geminiModel,
            message:
              clean,
            activeProfile:
              profileAfter ?? profileBefore,
            recentMessages:
              messagesWithUser.map((message) => ({
                role:
                  message.role,
                text:
                  message.text,
              })),
          });

        let targetProfile =
          profileAfter ?? profileBefore;

        const displayName =
          [parsed.displayName].find((name) =>
            name
              ? isPlausibleProfileName(name)
              : false
          );

        if (displayName && !replyDisplayName(targetProfile)) {
          targetProfile =
            upsertUserProfile(
              displayName
            );
          setActiveUserProfileId(
            targetProfile.id
          );
        } else if (
          !targetProfile &&
          activeProfileId
        ) {
          targetProfile =
            getUserProfileByIdFallback(
              activeProfileId
            );
        }

        const geminiMemoryItems =
          geminiResponse.profileUpdates
            .map((draft) =>
              createMemoryItemFromGeminiDraft(
                draft,
                clean
              )
            )
            .filter(
              (
                item
              ): item is UserMemoryItem =>
                item !== null &&
                parsed.memoryItems.some((deterministicItem) =>
                  deterministicItem.kind === item.kind &&
                  normalizeText(deterministicItem.value ?? deterministicItem.target ?? "") ===
                    normalizeText(item.value ?? item.target ?? "")
                )
            );

        if (
          targetProfile &&
          geminiMemoryItems.length > 0
        ) {
          profileAfter =
            addMemoryItemsToUserProfile(
              targetProfile.id,
              geminiMemoryItems
            ) ?? targetProfile;
        } else {
          profileAfter = targetProfile;
        }

        decision =
          emotionDecisionFromGemini(
            geminiResponse
          );

        robotReply =
          geminiResponse.reply;
        responseSource =
          "Gemini";

        setGeminiStatus(
          `Gemini used after local routing: ${geminiResponse.reason}`
        );
      } catch (error) {
        setGeminiStatus(
          error instanceof Error
            ? `Gemini fallback failed: ${error.message}`
            : "Gemini fallback failed."
        );
      }
    }

    if (
      aiResponseMode === "rescue_with_gemini" &&
      geminiApiKey.trim().length === 0
    ) {
      robotReply = "Full Gemini mode is selected, but the Gemini API key is not configured. Please ask a teacher to add it in Teacher Mode.";
      responseSource = "technical fallback";
      responseCategory = "safe_fallback";
      decision = {
        emotionId: EMOTION_IDLE_ID,
        emotionLabel: "Idle",
        confidence: 0.99,
        reason: "Full Gemini mode requires a configured API key.",
      };
    }

    const replySafetyResult =
      checkChildSafety(
        robotReply,
        safetyPolicy
      );

    if (!replySafetyResult.allowed) {
      robotReply =
        safetyPolicy.safeReply;
      responseSource =
        "safety";

      decision = {
        emotionId:
          EMOTION_IDLE_ID,
        emotionLabel:
          "Idle",
        confidence:
          0.99,
        reason:
          `Robot reply blocked before display: ${replySafetyResult.reason}`,
      };
    }

    const nextMessages:
      ChatMessage[] = [
        ...(messagesRef.current.some((message) => message.id === userMessage.id)
          ? messagesRef.current
          : [...messagesRef.current, userMessage]),
        {
          id: safeRandomId(),
          role: "robot",
          text: robotReply,
          emotionLabel:
            decision.emotionLabel,
          createdAt: nowIso(),
        },
      ];

    setMessages(
      nextMessages
    );
    messagesRef.current = nextMessages;

    activeSendCountRef.current = Math.max(0, activeSendCountRef.current - 1);
    setIsRobotTyping(activeSendCountRef.current > 0);

    const deterministicCandidates = parsed.memoryItems.map(memoryItemAsUserPhrase);
    const semanticCandidates = semanticAnalysis?.candidateProfileFacts.map(
      (candidate) => `${candidate.field}: ${candidate.value}`
    ) ?? [];
    const acceptedSemanticCandidates = semanticAnalysis?.candidateProfileFacts
      .filter((candidate) => Boolean(
        profileAfter &&
        !semanticAnalysis?.needsClarification &&
        createMemoryItemFromSemanticCandidate(candidate, clean)
      ))
      .map((candidate) => `${candidate.field}: ${candidate.value}`) ?? [];
    const rejectedSemanticCandidates = semanticAnalysis?.candidateProfileFacts
      .filter((candidate) => !acceptedSemanticCandidates.includes(`${candidate.field}: ${candidate.value}`))
      .map((candidate) => `${candidate.field}: ${candidate.value}`) ?? [];
    const finalIdentityState = identityStateForProfile(profileAfter ?? getActiveUserProfile());
    if (finalIdentityState === "known_student") setStudentIdentityState("known_student");

    setResponseDebug({
      source: responseSource,
      localModelCalled: localLlmWasAttempted,
      mode: aiResponseModeLabel(aiResponseMode),
      detectedIntent: semanticAnalysis?.intent ?? deterministicIntent.intent,
      studentEmotion: semanticAnalysis?.studentEmotion ?? deterministicIntent.studentEmotion,
      emotionConfidence: semanticAnalysis?.emotionConfidence ?? deterministicIntent.confidence,
      responseCategory,
      identityState: finalIdentityState,
      profileCandidates: [...deterministicCandidates, ...semanticCandidates],
      acceptedProfileUpdates: [
        ...deterministicCandidates.filter((_candidate, index) =>
          profileAfter?.memoryItems.length !== profileBefore?.memoryItems.length && index < parsed.memoryItems.length
        ),
        ...acceptedSemanticCandidates,
      ],
      rejectedProfileUpdates: rejectedSemanticCandidates,
      clarificationRequested: Boolean(parsed.clarification || semanticAnalysis?.needsClarification),
      lightweightClassifierUsed: true,
      qwenRequestId,
      qwenParseStatus,
      geminiCalled: geminiWasAttempted,
      safetyResult: "safe",
      unsupportedIntent: understandingResult.unsupportedIntent,
    });

    emitDashboardEmotionPreview(
      decision,
      clean
    );

    refreshProfiles();
  };

  useEffect(() => {
    const handleVoiceChatInput =
      (event: Event): void => {
        const customEvent =
          event as CustomEvent<{
            transcript?: string;
            text?: string;
            source?: string;
          }>;

        const spokenText =
          customEvent.detail?.transcript ??
          customEvent.detail?.text ??
          "";

        if (!spokenText.trim()) {
          return;
        }

        void handleSend(spokenText);
      };

    window.addEventListener(
      "xrp:robot-chat-voice-input",
      handleVoiceChatInput as EventListener
    );

    return () => {
      window.removeEventListener(
        "xrp:robot-chat-voice-input",
        handleVoiceChatInput as EventListener
      );
    };
  });

  useEffect(() => {
    const handleRecognizedPerson =
      (event: Event): void => {
        const customEvent =
          event as CustomEvent<{
            profileId?: string;
            displayName?: string;
            confidence?: number;
            source?: string;
            cameraSessionId?: string;
          }>;

        const detail =
          customEvent.detail;

        if (
          !detail ||
          detail.source !==
            "camera_face_recognition" ||
          typeof detail.profileId !==
            "string" ||
          typeof detail.displayName !==
            "string" ||
          typeof detail.confidence !==
            "number" ||
          typeof detail.cameraSessionId !==
            "string" ||
          !detail.cameraSessionId ||
          !Number.isFinite(
            detail.confidence
          ) ||
          detail.confidence < 0.75 ||
          detail.confidence > 1
        ) {
          return;
        }

        const storedProfile =
          getFaceIdentityProfiles().find(
            (profile) =>
              profile.id ===
              detail.profileId
          );

        if (!storedProfile) {
          return;
        }

        const linkedUserProfile =
          getUserProfiles().find(
            (profile) =>
              profile.id ===
              storedProfile.userProfileId
          );

        if (!linkedUserProfile) {
          return;
        }

        const displayName =
          normalizeFaceIdentityDisplayName(
            linkedUserProfile.displayName
          );

        if (
          !displayName ||
          !isPlausibleProfileName(
            displayName
          ) ||
          displayName !==
            storedProfile.displayName ||
          detail.displayName !==
            storedProfile.displayName
        ) {
          return;
        }

        const policy =
          getChildSafetyPolicy();

        const nameSafety =
          checkChildSafety(
            displayName,
            policy
          );

        const greeting =
          `Hello ${displayName}! It's nice to see you.`;

        const greetingSafety =
          checkChildSafety(
            greeting,
            policy
          );

        if (
          !nameSafety.allowed ||
          !greetingSafety.allowed
        ) {
          return;
        }

        const now = Date.now();
        const lastGreetingAt =
          faceGreetingTimestampsRef.current.get(
            detail.profileId
          ) ?? 0;

        const userWasRecentlyActive =
          now -
            lastUserChatActivityAtRef.current <
          FACE_GREETING_COOLDOWN_MS;

        const isNewCameraSession =
          !greetedCameraSessionsRef.current.has(
            detail.cameraSessionId
          );

        if (
          !isNewCameraSession &&
          (
            userWasRecentlyActive ||
            now - lastGreetingAt <
              FACE_GREETING_COOLDOWN_MS
          )
        ) {
          return;
        }

        greetedCameraSessionsRef.current.add(
          detail.cameraSessionId
        );

        faceGreetingTimestampsRef.current.set(
          detail.profileId,
          now
        );

        /*
         * This is a trusted local recognition event, not student chat:
         * do not call Gemini, parse memory, or run chat keywords.
         */
        setActiveUserProfileId(
          linkedUserProfile.id
        );
        setStudentIdentityState("known_student");

        setMessages((current) => [
          ...current,
          {
            id: safeRandomId(),
            role: "robot",
            text: greeting,
            emotionLabel: "Happy",
            createdAt: nowIso(),
          },
        ]);

        emitDashboardEmotionPreview(
          {
            emotionId:
              EMOTION_HAPPY_ID,
            emotionLabel: "Happy",
            confidence: Math.max(
              0.85,
              detail.confidence
            ),
            reason:
              "Camera face recognition identified an enrolled person.",
          },
          "camera_face_recognition"
        );
      };

    window.addEventListener(
      "xrp:camera-person-recognized",
      handleRecognizedPerson as EventListener
    );

    return () => {
      window.removeEventListener(
        "xrp:camera-person-recognized",
        handleRecognizedPerson as EventListener
      );
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "xrp:robot-chat-ready"
      )
    );
  }, []);

  const handleClearChat = (): void => {
    const knownName = replyDisplayName(getActiveUserProfile());
    const clearedMessages: ChatMessage[] = [
      {
        id: safeRandomId(),
        role: "robot",
        text: knownName
          ? `Chat cleared. I'm ready to keep talking, ${knownName}.`
          : onboardingGreeting(robotName),
        emotionLabel: "Idle",
        createdAt: nowIso(),
      },
    ];
    messagesRef.current = clearedMessages;
    setMessages(clearedMessages);
    setStudentIdentityState(knownName ? "known_student" : "awaiting_name");
  };

  return (
    <>
      <MemoryDialog
        activeProfile={activeProfile}
        activeProfileSummary={
          activeProfileSummary
        }
        isOpen={showMemory}
        mode={memoryViewMode}
        onClose={() =>
          setShowMemory(false)
        }
        onModeChange={
          setMemoryViewMode
        }
      />

      <RobotNameDialog
        isOpen={showRobotNameDialog}
        robotName={robotName}
        onChangeRobotName={
          setRobotName
        }
        onClose={() =>
          setShowRobotNameDialog(false)
        }
      />

      <ChatKeywordsDialog
        chatKeywordEmotion={
          chatKeywordEmotion
        }
        chatKeywordPhrase={
          chatKeywordPhrase
        }
        chatKeywordReply={
          chatKeywordReply
        }
        chatKeywordRules={
          chatKeywordRules
        }
        isOpen={showChatKeywords}
        onAddChatKeyword={
          handleAddChatKeyword
        }
        onChangeEmotion={
          setChatKeywordEmotion
        }
        onChangePhrase={
          setChatKeywordPhrase
        }
        onChangeReply={
          setChatKeywordReply
        }
        onClose={() =>
          setShowChatKeywords(false)
        }
        onDeleteChatKeyword={(ruleId) => {
          deleteChatKeywordRule(ruleId);
          setChatKeywordRules(
            getChatKeywordRules()
          );
        }}
      />

      <TeacherModeDialog
        aiResponseMode={aiResponseMode}
        customSafetyTermInput={
          customSafetyTermInput
        }
        geminiApiKey={geminiApiKey}
        geminiModel={geminiModel}
        geminiStatus={geminiStatus}
        isOpen={showTeacherMode}
        localLlmEnabled={localLlmEnabled}
        localLlmModelId={localLlmModelId}
        localLlmRuntime={localLlmRuntime}
        newTeacherPasscode={
          newTeacherPasscode
        }
        safetyPolicy={safetyPolicy}
        teacherModeStatus={
          teacherModeStatus
        }
        teacherPasscodeInput={
          teacherPasscodeInput
        }
        teacherUnlocked={teacherUnlocked}
        onAddCustomSafetyTerm={
          handleAddCustomSafetyTerm
        }
        onChangeAiResponseMode={
          setAiResponseMode
        }
        onChangeGeminiApiKey={
          setGeminiApiKey
        }
        onChangeGeminiModel={
          setGeminiModel
        }
        onChangeLocalLlmEnabled={
          setLocalLlmEnabled
        }
        onChangeNewTeacherPasscode={
          setNewTeacherPasscode
        }
        onChangeTeacherPasscode={
          handleChangeTeacherPasscode
        }
        onChangeTeacherPasscodeInput={
          setTeacherPasscodeInput
        }
        onChangeCustomSafetyTermInput={
          setCustomSafetyTermInput
        }
        onClearStatus={() =>
          setTeacherModeStatus("")
        }
        onClose={() =>
          setShowTeacherMode(false)
        }
        onExportRules={
          handleExportSafetyRules
        }
        onImportRulesText={
          handleImportSafetyRules
        }
        onLoadLocalLlm={() => {
          void handleLoadLocalLlm();
        }}
        onLock={() => {
          setTeacherUnlocked(false);
          setTeacherModeStatus(
            "Teacher Mode locked."
          );
        }}
        onResetPolicy={() => {
          resetChildSafetyPolicy();
          setSafetyPolicy(
            getChildSafetyPolicy()
          );
          setTeacherModeStatus(
            "Safety policy reset."
          );
        }}
        onUnlock={handleTeacherUnlock}
        onUnloadLocalLlm={
          handleUnloadLocalLlm
        }
        onUpdateSafetyPolicy={
          updateSafetyPolicy
        }
      />

      <SensorCard
      title={`${robotName} Chat`}
      icon={<FaCommentDots size={16} />}
      onStart={() => {}}
      onStop={() => {}}
      isConnected={true}
      lastUpdated={
        messages[messages.length - 1]
          ?.createdAt
      }
    >
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={handleClearChat}
          className="rounded border border-white bg-black px-2 py-1 text-[10px] font-bold text-white transition hover:bg-white hover:text-black"
          title="Clear chat"
          type="button"
        >
          Clear
        </button>

        <button
          onClick={handleDelete}
          className="rounded border border-red-400 bg-black p-2 text-red-300 transition hover:bg-red-500 hover:text-white"
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col gap-2 rounded-xl bg-black p-3 pt-1 text-xs text-white">
        <div className="hidden">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
              Robot name
            </div>

            <div className="truncate text-sm font-bold">
              {robotName}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-blue-500/70 p-2">
          <button
            type="button"
            onClick={() =>
              setShowRobotNameDialog(true)
            }
            className="shrink-0 rounded border border-sky-300 bg-sky-700 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-sky-600"
            style={{
              backgroundColor: "#0369a1",
              borderColor: "#7dd3fc",
              color: "#ffffff",
            }}
          >
            Set robot name
          </button>

          <button
            type="button"
            onClick={() => {
              setMemoryViewMode(
                "neural_network"
              );
              setShowMemory(true);
            }}
            className="shrink-0 rounded border border-emerald-300 bg-emerald-700 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-emerald-600"
            style={{
              backgroundColor: "#047857",
              borderColor: "#6ee7b7",
              color: "#ffffff",
            }}
          >
            See memory
          </button>

          <button
            type="button"
            onClick={() =>
              setShowTeacherMode(true)
            }
            className="shrink-0 rounded border border-purple-300 bg-purple-700 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-purple-600"
            style={{
              backgroundColor: "#7e22ce",
              borderColor: "#d8b4fe",
              color: "#ffffff",
            }}
          >
            Teacher Mode
          </button>

          <button
            type="button"
            onClick={() =>
              setShowChatKeywords(true)
            }
            className="shrink-0 rounded border border-amber-300 bg-amber-700 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-amber-600"
            style={{
              backgroundColor: "#b45309",
              borderColor: "#fcd34d",
              color: "#ffffff",
            }}
          >
            Chat keywords
          </button>
        </div>

        <div className="rounded-xl border border-emerald-500/70 bg-black p-3 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-white">
              Active profile
            </div>

            <FaUser size={14} />
          </div>

          <select
            value={
              activeProfile?.id ?? ""
            }
            onChange={(event) => {
              const profileId =
                event.target.value;

              setActiveUserProfileId(
                profileId || null
              );

              refreshProfiles();
            }}
            className={`${inputClass} mt-2 w-full`}
          >
            <option
              value=""
              className="bg-black text-white"
            >
              No active profile
            </option>

            {profiles.map((profile) => (
              <option
                key={profile.id}
                value={profile.id}
                className="bg-black text-white"
              >
                {profile.displayName}
              </option>
            ))}
          </select>

          {activeProfile && teacherUnlocked && (
            <button
              type="button"
              onClick={() => {
                deleteUserProfile(
                  activeProfile.id
                );

                setActiveUserProfileId(null);
                pendingNameRef.current = null;
                setStudentIdentityState("awaiting_name");
                const resetMessages: ChatMessage[] = [{
                  id: safeRandomId(),
                  role: "robot",
                  text: onboardingGreeting(robotName),
                  emotionLabel: "Happy",
                  createdAt: nowIso(),
                }];
                messagesRef.current = resetMessages;
                setMessages(resetMessages);
                refreshProfiles();
              }}
              className="mt-2 w-full rounded border border-red-400 bg-black px-3 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              Delete active profile
            </button>
          )}

        </div>

        <div className="hidden">
          <button
            type="button"
            onClick={() =>
              setShowTeacherMode(true)
            }
            className={`${buttonClass} w-full`}
          >
            Teacher Mode
          </button>
        </div>

        <div className="hidden">
          <button
            type="button"
            onClick={() =>
              setShowChatKeywords(true)
            }
            className={`${buttonClass} w-full`}
          >
            See chat keywords
          </button>

          {false && showChatKeywords && !teacherUnlocked && (
            <div className="mt-3 rounded-lg border border-yellow-400 bg-black p-2 text-[11px] leading-4 text-yellow-200">
              Unlock Teacher Mode to edit custom chat keywords.
            </div>
          )}

          {false && showChatKeywords && teacherUnlocked && (
            <div className="mt-3 grid gap-2">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  If chat contains
                </label>

                <input
                  value={chatKeywordPhrase}
                  onChange={(event) =>
                    setChatKeywordPhrase(
                      event.target.value
                    )
                  }
                  className={`${inputClass} w-full`}
                  placeholder="Example: Mario Kart"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Emotion
                </label>

                <select
                  value={chatKeywordEmotion}
                  onChange={(event) =>
                    setChatKeywordEmotion(
                      event.target
                        .value as ChatKeywordEmotionKey
                    )
                  }
                  className={`${inputClass} w-full`}
                >
                  {CHAT_KEYWORD_EMOTION_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.key}
                        value={option.key}
                        className="bg-black text-white"
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Robot reply
                </label>

                <textarea
                  value={chatKeywordReply}
                  onChange={(event) =>
                    setChatKeywordReply(
                      event.target.value
                    )
                  }
                  className={`${inputClass} min-h-[64px] w-full resize-none`}
                  placeholder="Example: I remember Mario Kart matters to you."
                />
              </div>

              <button
                type="button"
                onClick={handleAddChatKeyword}
                className={`${buttonClass} w-full`}
              >
                Add chat keyword
              </button>

              <div className="grid gap-2">
                {chatKeywordRules.length === 0 ? (
                  <div className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-zinc-300">
                    No custom chat keywords yet.
                  </div>
                ) : (
                  chatKeywordRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-white"
                    >
                      <div className="font-bold">
                        {rule.phrase} →{" "}
                        {
                          getChatKeywordEmotionOption(
                            rule.emotionKey
                          ).label
                        }
                      </div>

                      {rule.reply && (
                        <div className="mt-1 text-zinc-300">
                          {rule.reply}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          deleteChatKeywordRule(
                            rule.id
                          );

                          setChatKeywordRules(
                            getChatKeywordRules()
                          );
                        }}
                        className="mt-2 rounded border border-red-400 bg-black px-2 py-1 text-[10px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-cyan-500/70 bg-black p-3">
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={[
                  "max-w-[90%] rounded-xl border p-2 leading-5",
                  message.role === "user"
                    ? "self-end border-sky-300 bg-sky-700 text-white"
                    : "self-start border-emerald-300 bg-emerald-950 text-white",
                ].join(" ")}
                style={
                  message.role === "user"
                    ? {
                        backgroundColor: "#1d4ed8",
                        borderColor: "#93c5fd",
                        color: "#ffffff",
                      }
                    : {
                        backgroundColor: "#064e3b",
                        borderColor: "#6ee7b7",
                        color: "#ffffff",
                      }
                }
              >
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {message.role === "user"
                    ? "You"
                    : `${robotName} ${emotionEmoji(
                        message.emotionLabel
                      )}`}
                </div>

                <div>
                  {message.text}
                </div>

                {message.emotionLabel && (
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                    Emotion: {message.emotionLabel}
                  </div>
                )}
              </div>
            ))}

            {isRobotTyping && (
              <div
                className="max-w-[90%] self-start rounded-xl border border-emerald-300 bg-emerald-950 p-2 leading-5 text-white"
                style={{
                  backgroundColor: "#064e3b",
                  borderColor: "#6ee7b7",
                  color: "#ffffff",
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {robotName}
                </div>

                <div
                  className="mt-1 flex items-center gap-1"
                  aria-label="Robot is typing"
                >
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.2s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.1s]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white" />
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-cyan-500/70 p-2">
          <textarea
            value={input}
            onChange={(event) =>
              setInput(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Talk to the robot..."
            className={`${inputClass} flex-1 resize-none`}
          />

          <button
            type="button"
            onClick={() => {
              void handleSend();
            }}
            className="rounded border border-white bg-black px-3 text-white transition hover:bg-white hover:text-black"
            title="Send"
          >
            <FaPaperPlane size={14} />
          </button>
        </div>

      </div>
      </SensorCard>
    </>
  );
};


export default RobotChatWidget;
