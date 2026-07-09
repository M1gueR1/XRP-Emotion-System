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

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  USER_PROFILE_CHANGED_EVENT,
  addMemoryItemsToUserProfile,
  factFromMemoryItem,
  getActiveUserProfile,
  getActiveUserProfileId,
  getUserProfiles,
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
  findMatchingCustomEmotionKeyword,
  getEmotionOptionByKey,
} from "../keywords/customEmotionKeywordStore";

import {
  askGeminiRobotChat,
  type GeminiMemoryDraft,
  type GeminiRobotChatResponse,
} from "../llm/geminiRobotChatAdapter";

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


type AiResponseMode =
  | "local_only"
  | "smart_fallback"
  | "rescue_with_gemini";

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

const panelClass =
  "rounded-xl border border-white bg-black p-3 text-white";


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
    value === "local_only" ||
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

  const legacyGeminiEnabled =
    readLocalStorage(
      LEGACY_GEMINI_ENABLED_STORAGE_KEY,
      "false"
    ) === "true";

  return legacyGeminiEnabled
    ? "smart_fallback"
    : "local_only";
}


function aiResponseModeLabel(
  mode: AiResponseMode
): string {
  switch (mode) {
    case "local_only":
      return "Local only";
    case "smart_fallback":
      return "Smart Gemini fallback";
    case "rescue_with_gemini":
      return "Rescue with Gemini";
    default:
      return "Local only";
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
    if (profile.memoryItems.length === 0) {
      return `You are ${profile.displayName}. I do not have saved facts about you yet.`;
    }

    return `You are ${profile.displayName}. I remember: ${profile.memoryItems
      .map((item) =>
        factFromMemoryItem(
          item,
          profile.displayName
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
    return `you work on ${item.value}`;
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
    profile?.displayName;

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
    const facts =
      profileAfter.memoryItems.length > 0
        ? ` I also saved what I learned: ${profileAfter.memoryItems
            .map(memoryItemAsUserPhrase)
            .join("; ")}.`
        : "";

    if (isStrongEmotionalDecision(decision)) {
      if (decision.emotionLabel === "Sad") {
        return `Nice to meet you, ${profileAfter.displayName}. I'm sorry you're feeling this way. I'm here with you.${facts}`;
      }

      if (decision.emotionLabel === "Upset") {
        return `Nice to meet you, ${profileAfter.displayName}. That sounds frustrating, but we'll take it one step at a time.${facts}`;
      }

      if (decision.emotionLabel === "Excited") {
        return `Nice to meet you, ${profileAfter.displayName}. That sounds exciting.${facts}`;
      }

      if (decision.emotionLabel === "In love") {
        return `Nice to meet you, ${profileAfter.displayName}. I like being your robot friend too.${facts}`;
      }
    }

    return `Nice to meet you, ${profileAfter.displayName}.${facts}`;
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

    if (strongest?.target) {
      return `Got it, ${profileAfter.displayName}. I learned that you ${describeIntensity(
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

    return `Got it, ${profileAfter.displayName}. I updated your memory: ${newItems
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

  return {
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


function shouldUseGeminiForMessage(
  mode: AiResponseMode,
  apiKey: string,
  hasExactLocalAnswer: boolean,
  localConfidence: number,
  localMlConfidence: number,
  localMlEmotionKey: string,
  localEmpathyConfidence: number,
  isSmallTalk: boolean
): boolean {
  if (mode !== "smart_fallback") {
    return false;
  }

  const localMlIsUseful =
    localMlEmotionKey !== "idle" &&
    localMlConfidence >= 0.62;

  const localEmpathyIsUseful =
    localEmpathyConfidence >= 0.72;

  return (
    apiKey.trim().length > 0 &&
    !hasExactLocalAnswer &&
    !isSmallTalk &&
    localConfidence < 0.76 &&
    !localMlIsUseful &&
    !localEmpathyIsUseful
  );
}


function shouldRescueLocalReplyWithGemini(
  mode: AiResponseMode,
  apiKey: string,
  hasExactLocalAnswer: boolean,
  isSmallTalk: boolean,
  robotReply: string,
  decision: ChatEmotionDecision
): boolean {
  return (
    mode === "rescue_with_gemini" &&
    apiKey.trim().length > 0 &&
    !hasExactLocalAnswer &&
    !isSmallTalk &&
    isWeakLocalReply(robotReply, decision)
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
  ] = useState<ChatMessage[]>([
    {
      id: safeRandomId(),
      role: "robot",
      text: "Hi. You can talk to me or introduce yourself naturally. Example: “Hi im Santiago, I am from Colombia, I study systems engineering, I prefer basketball, and Colombia losing makes me sad.”",
      emotionLabel: "Idle",
      createdAt: nowIso(),
    },
  ]);

  const [
    showMemory,
    setShowMemory,
  ] = useState(false);

  const [
    showAiOptions,
    setShowAiOptions,
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

  const [
    safetyRulesJson,
    setSafetyRulesJson,
  ] = useState("");

  const scrollRef =
    useRef<HTMLDivElement>(null);

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


  const handleImportSafetyRules = (): void => {
    try {
      const imported =
        importChildSafetyPolicyJson(
          safetyRulesJson,
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
    setSafetyRulesJson(
      exportChildSafetyPolicyJson(
        safetyPolicy
      )
    );

    setTeacherModeStatus(
      "Safety rules exported to the text box."
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
    if (!teacherUnlocked) {
      setTeacherModeStatus(
        "Unlock Teacher Mode to edit chat keywords."
      );
      return;
    }

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

    /*
     * Typed and voice-to-chat messages both count as active
     * conversation and suppress camera greetings for 30 seconds.
     */
    lastUserChatActivityAtRef.current =
      Date.now();

    const safetyResult =
      checkChildSafety(
        clean,
        safetyPolicy
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
          ...messages,
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

      setInput("");

      emitDashboardEmotionPreview(
        safetyDecision,
        clean
      );

      return;
    }

    const profileBefore =
      getActiveUserProfile();

    const activeProfileId =
      getActiveUserProfileId();

    const parsed =
      parseProfileText(clean);

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
        profileBefore?.displayName
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

    let usedGemini = false;

    if (
      shouldUseGeminiForMessage(
        aiResponseMode,
        geminiApiKey,
        Boolean(keywordMatch) ||
          Boolean(chatKeywordMatch) ||
          Boolean(preliminaryMemoryAnswer),
        localSocialReasoning.confidence,
        localMlEmotion.confidence,
        localMlEmotion.emotionKey,
        localEmpathy.decision.confidence,
        isSmallTalk
      )
    ) {
      setGeminiStatus(
        "Asking Gemini..."
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
              profileBefore,
            recentMessages:
              messages.map((message) => ({
                role:
                  message.role,
                text:
                  message.text,
              })),
          });

        let targetProfile =
          profileBefore;

        const displayName =
          geminiResponse.displayName ||
          parsed.displayName;

        if (displayName) {
          targetProfile =
            upsertUserProfile(
              displayName
            );

          setActiveUserProfileId(
            targetProfile.id
          );
        } else if (activeProfileId) {
          targetProfile =
            getUserProfileByIdFallback(
              activeProfileId
            );
        }

        const memoryItems =
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
                item !== null
            );

        if (
          targetProfile &&
          memoryItems.length > 0
        ) {
          profileAfter =
            addMemoryItemsToUserProfile(
              targetProfile.id,
              memoryItems
            ) ?? targetProfile;
        } else {
          profileAfter =
            targetProfile;
        }

        if (profileAfter) {
          setActiveUserProfileId(
            profileAfter.id
          );
        }

        decision =
          emotionDecisionFromGemini(
            geminiResponse
          );

        robotReply =
          geminiResponse.reply;

        usedGemini = true;

        setGeminiStatus(
          `Gemini used: ${geminiResponse.reason}`
        );
      } catch (error) {
        setGeminiStatus(
          error instanceof Error
            ? `Gemini fallback failed: ${error.message}`
            : "Gemini fallback failed."
        );
      }
    }

    if (!usedGemini) {
      const learnedProfile =
        learnFromProfileText(
          clean,
          activeProfileId ?? undefined
        );

      if (learnedProfile) {
        setActiveUserProfileId(
          learnedProfile.id
        );
      }

      profileAfter =
        learnedProfile ??
        getActiveUserProfile();

      const memoryAnswer =
        buildMemoryQuestionReply(
          clean,
          profileAfter ?? profileBefore
        );

      decision =
        chatKeywordMatch
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
                  0.55,
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
              : shouldPreferLocalSocialReasoning(
                  localSocialReasoning
                )
              ? localSocialReasoning.decision
              : shouldPreferLocalEmpathy(
                  localEmpathy
                )
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
        chatKeywordMatch
          ? (
              chatKeywordMatch.rule.reply ||
              `I matched "${chatKeywordMatch.rule.phrase}", so I changed my emotion to ${decision.emotionLabel}.`
            )
          : isSmallTalk
            ? smallTalkReply(
                clean,
                robotName,
                profileAfter?.displayName ??
                  profileBefore?.displayName
              )
            : localSocialReasoning.reply ??
              (
                shouldPreferLocalEmpathy(
                  localEmpathy
                )
                  ? localEmpathy.reply
                  : shouldPreferLocalMlEmotion(
                      localMlEmotion
                    )
                    ? localMlEmpathyReply(
                        localMlEmotion,
                        profileAfter?.displayName ??
                          profileBefore?.displayName
                      )
                    : buildRobotReply(
                        clean,
                        profileBefore,
                        profileAfter,
                        parsed.memoryItems,
                        decision,
                        keywordMatch?.rule.phrase
                      )
              );

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

      if (
        shouldRescueLocalReplyWithGemini(
          aiResponseMode,
          geminiApiKey,
          Boolean(keywordMatch) ||
            Boolean(chatKeywordMatch) ||
            Boolean(preliminaryMemoryAnswer),
          isSmallTalk,
          robotReply,
          decision
        )
      ) {
        setGeminiStatus(
          "Rescuing weak local reply with Gemini..."
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
                messages.map((message) => ({
                  role:
                    message.role,
                  text:
                    message.text,
                })),
            });

          decision =
            emotionDecisionFromGemini(
              geminiResponse
            );

          robotReply =
            geminiResponse.reply;

          usedGemini = true;

          setGeminiStatus(
            `Gemini rescued weak local reply: ${geminiResponse.reason}`
          );
        } catch (error) {
          setGeminiStatus(
            error instanceof Error
              ? `Gemini rescue failed: ${error.message}`
              : "Gemini rescue failed."
          );
        }
      }
    }

    const replySafetyResult =
      checkChildSafety(
        robotReply,
        safetyPolicy
      );

    if (!replySafetyResult.allowed) {
      robotReply =
        safetyPolicy.safeReply;

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
        ...messages,
        {
          id: safeRandomId(),
          role: "user",
          text: rawInput,
          createdAt: nowIso(),
        },
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

    setInput("");

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
    setMessages([
      {
        id: safeRandomId(),
        role: "robot",
        text: "Chat cleared. You can keep talking to me.",
        emotionLabel: "Idle",
        createdAt: nowIso(),
      },
    ]);
  };

  return (
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

      <div className="flex h-full w-full flex-col gap-3 rounded-xl bg-black p-3 pt-10 text-xs text-white">
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-white">
                Active profile
              </div>

              <div className="truncate text-[11px] text-zinc-300">
                {activeProfile
                  ? activeProfile.displayName
                  : "No profile yet"}
              </div>
            </div>

            <FaUser size={14} />
          </div>

          {profiles.length > 0 && (
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
          )}

          {activeProfile && teacherUnlocked && (
            <button
              type="button"
              onClick={() => {
                deleteUserProfile(
                  activeProfile.id
                );

                setActiveUserProfileId(null);
                refreshProfiles();
              }}
              className="mt-2 w-full rounded border border-red-400 bg-black px-3 py-1 text-xs font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
            >
              Delete active profile
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setShowMemory(
                (current) => !current
              )
            }
            className={`${buttonClass} mt-2 w-full`}
          >
            {showMemory
              ? "Hide memory"
              : "See memory"}
          </button>

          {showMemory && (
            <div className="mt-2 rounded-lg border border-white bg-black p-2 text-[11px] leading-4 text-white">
              {activeProfileSummary}
            </div>
          )}
        </div>

        <div className={panelClass}>
          <button
            type="button"
            onClick={() =>
              setShowTeacherMode(
                (current) => !current
              )
            }
            className={`${buttonClass} w-full`}
          >
            {showTeacherMode
              ? "Hide Teacher Mode"
              : "Teacher Mode"}
          </button>

          {showTeacherMode && (
            <div className="mt-3 grid gap-3">
              {!teacherUnlocked ? (
                <div className="grid gap-2">
                  <div className="rounded-lg border border-white bg-black p-2 text-[11px] leading-4 text-white">
                    Teacher Mode protects safety rules, chat keywords, Gemini settings, and robot customization.
                    Demo passcode: teacher123
                  </div>

                  <input
                    value={teacherPasscodeInput}
                    onChange={(event) =>
                      setTeacherPasscodeInput(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleTeacherUnlock();
                      }
                    }}
                    className={`${inputClass} w-full`}
                    placeholder="Teacher passcode"
                    type="password"
                  />

                  <button
                    type="button"
                    onClick={handleTeacherUnlock}
                    className={`${buttonClass} w-full`}
                  >
                    Unlock Teacher Mode
                  </button>

                  {teacherModeStatus && (
                    <div className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-white">
                      {teacherModeStatus}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-lg border border-emerald-400 bg-black p-2 text-[11px] leading-4 text-emerald-200">
                    Teacher Mode unlocked. Safety filter is still applied before memory, ML, Gemini, and custom chat keywords.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTeacherUnlocked(false);
                      setTeacherModeStatus(
                        "Teacher Mode locked."
                      );
                    }}
                    className="rounded border border-yellow-400 bg-black px-3 py-1 text-xs font-bold text-yellow-200 transition hover:bg-yellow-400 hover:text-black"
                  >
                    Lock Teacher Mode
                  </button>

                  <div className="rounded-lg border border-white bg-black p-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSafetyPolicy({
                          ...safetyPolicy,
                          enabled:
                            !safetyPolicy.enabled,
                        })
                      }
                      className={[
                        "w-full rounded border border-white px-3 py-1.5 text-xs font-bold transition",
                        safetyPolicy.enabled
                          ? "bg-white text-black"
                          : "bg-black text-white hover:bg-white hover:text-black",
                      ].join(" ")}
                    >
                      Child safety filter:{" "}
                      {safetyPolicy.enabled
                        ? "On"
                        : "Off"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateSafetyPolicy({
                          ...safetyPolicy,
                          semanticClassifierEnabled:
                            !safetyPolicy.semanticClassifierEnabled,
                        })
                      }
                      className={[
                        "mt-2 w-full rounded border border-white px-3 py-1.5 text-xs font-bold transition",
                        safetyPolicy.semanticClassifierEnabled
                          ? "bg-white text-black"
                          : "bg-black text-white hover:bg-white hover:text-black",
                      ].join(" ")}
                    >
                      Local safety classifier:{" "}
                      {safetyPolicy.semanticClassifierEnabled
                        ? "On"
                        : "Off"}
                    </button>

                    <div className="mt-2 rounded border border-zinc-700 bg-black p-2 text-[10px] leading-4 text-zinc-300">
                      The classifier helps block unsafe paraphrases or synonyms even when the exact blocked word is not used.
                    </div>

                    <div className="mt-2 grid gap-2">
                      {CHILD_SAFETY_CATEGORY_OPTIONS.map(
                        (option) => (
                          <label
                            key={option.key}
                            className="flex items-start gap-2 rounded border border-zinc-700 bg-black p-2 text-[11px] leading-4 text-white"
                          >
                            <input
                              type="checkbox"
                              checked={
                                safetyPolicy
                                  .enabledCategories[
                                  option.key
                                ]
                              }
                              onChange={(event) =>
                                updateSafetyPolicy({
                                  ...safetyPolicy,
                                  enabledCategories: {
                                    ...safetyPolicy.enabledCategories,
                                    [option.key]:
                                      event.target.checked,
                                  },
                                })
                              }
                              className="mt-1"
                            />

                            <span>
                              <span className="font-bold">
                                {option.label}
                              </span>
                              <br />
                              <span className="text-zinc-300">
                                {option.description}
                              </span>
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-lg border border-white bg-black p-2">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      Safe reply
                    </label>

                    <textarea
                      value={safetyPolicy.safeReply}
                      onChange={(event) =>
                        updateSafetyPolicy({
                          ...safetyPolicy,
                          safeReply:
                            event.target.value,
                        })
                      }
                      className={`${inputClass} min-h-[72px] w-full resize-none`}
                    />
                  </div>

                  <div className="grid gap-2 rounded-lg border border-white bg-black p-2">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      Custom blocked term
                    </label>

                    <div className="flex gap-2">
                      <input
                        value={customSafetyTermInput}
                        onChange={(event) =>
                          setCustomSafetyTermInput(
                            event.target.value
                          )
                        }
                        className={`${inputClass} flex-1`}
                        placeholder="Example: scary topic"
                      />

                      <button
                        type="button"
                        onClick={handleAddCustomSafetyTerm}
                        className={buttonClass}
                      >
                        Add
                      </button>
                    </div>

                    <div className="grid gap-1">
                      {safetyPolicy.customBlockedTerms.length === 0 ? (
                        <div className="text-[10px] text-zinc-400">
                          No custom blocked terms yet.
                        </div>
                      ) : (
                        safetyPolicy.customBlockedTerms.map(
                          (term) => (
                            <div
                              key={term}
                              className="flex items-center justify-between gap-2 rounded border border-zinc-700 bg-black px-2 py-1 text-[10px] text-white"
                            >
                              <span>{term}</span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateSafetyPolicy({
                                    ...safetyPolicy,
                                    customBlockedTerms:
                                      safetyPolicy.customBlockedTerms.filter(
                                        (item) =>
                                          item !== term
                                      ),
                                  })
                                }
                                className="rounded border border-red-400 px-2 py-0.5 text-red-300 hover:bg-red-500 hover:text-white"
                              >
                                Delete
                              </button>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-lg border border-white bg-black p-2">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      Import / export safety rules JSON
                    </label>

                    <textarea
                      value={safetyRulesJson}
                      onChange={(event) =>
                        setSafetyRulesJson(
                          event.target.value
                        )
                      }
                      className={`${inputClass} min-h-[90px] w-full resize-none font-mono`}
                      placeholder="{ ... }"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleExportSafetyRules}
                        className={buttonClass}
                      >
                        Export rules
                      </button>

                      <button
                        type="button"
                        onClick={handleImportSafetyRules}
                        className={buttonClass}
                      >
                        Import rules
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-lg border border-white bg-black p-2">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                      Change teacher passcode
                    </label>

                    <input
                      value={newTeacherPasscode}
                      onChange={(event) =>
                        setNewTeacherPasscode(
                          event.target.value
                        )
                      }
                      className={`${inputClass} w-full`}
                      placeholder="New passcode"
                      type="password"
                    />

                    <button
                      type="button"
                      onClick={handleChangeTeacherPasscode}
                      className={buttonClass}
                    >
                      Save passcode
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetChildSafetyPolicy();
                        setSafetyPolicy(
                          getChildSafetyPolicy()
                        );
                        setTeacherModeStatus(
                          "Safety policy reset."
                        );
                      }}
                      className="rounded border border-yellow-400 bg-black px-3 py-1 text-xs font-bold text-yellow-200 transition hover:bg-yellow-400 hover:text-black"
                    >
                      Reset safety policy
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTeacherModeStatus("")
                      }
                      className={buttonClass}
                    >
                      Clear status
                    </button>
                  </div>

                  {teacherModeStatus && (
                    <div className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-white">
                      {teacherModeStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={panelClass}>
          <button
            type="button"
            onClick={() =>
              setShowChatKeywords(
                (current) => !current
              )
            }
            className={`${buttonClass} w-full`}
          >
            {showChatKeywords
              ? "Hide chat keywords"
              : "See chat keywords"}
          </button>

          {showChatKeywords && !teacherUnlocked && (
            <div className="mt-3 rounded-lg border border-yellow-400 bg-black p-2 text-[11px] leading-4 text-yellow-200">
              Unlock Teacher Mode to edit custom chat keywords.
            </div>
          )}

          {showChatKeywords && teacherUnlocked && (
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

        <div className={panelClass}>
          <button
            type="button"
            onClick={() =>
              setShowAiOptions(
                (current) => !current
              )
            }
            className={`${buttonClass} w-full`}
          >
            {showAiOptions
              ? "Hide AI options"
              : "See AI options"}
          </button>

          {showAiOptions && !teacherUnlocked && (
            <div className="mt-3 rounded-lg border border-yellow-400 bg-black p-2 text-[11px] leading-4 text-yellow-200">
              Unlock Teacher Mode to edit the robot name, Gemini settings, or API key.
            </div>
          )}

          {showAiOptions && teacherUnlocked && (
            <div className="mt-3 grid gap-2">
              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  Robot name
                </label>

                <input
                  value={robotName}
                  onChange={(event) =>
                    setRobotName(
                      event.target.value ||
                        "XRP Robot"
                    )
                  }
                  className={`${inputClass} w-full`}
                  placeholder="XRP Robot"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
                  AI response mode
                </label>

                <select
                  value={aiResponseMode}
                  onChange={(event) =>
                    setAiResponseMode(
                      event.target
                        .value as AiResponseMode
                    )
                  }
                  className={`${inputClass} w-full`}
                >
                  <option
                    value="local_only"
                    className="bg-black text-white"
                  >
                    Local only
                  </option>
                  <option
                    value="smart_fallback"
                    className="bg-black text-white"
                  >
                    Smart Gemini fallback
                  </option>
                  <option
                    value="rescue_with_gemini"
                    className="bg-black text-white"
                  >
                    Rescue with Gemini
                  </option>
                </select>

                <div className="rounded-lg border border-zinc-700 bg-black p-2 text-[10px] leading-4 text-zinc-300">
                  Current mode: {aiResponseModeLabel(aiResponseMode)}.
                  Local only never calls Gemini. Smart fallback calls Gemini before local response when confidence is low.
                  Rescue mode tries local first and only calls Gemini if the local reply would be too weak.
                </div>
              </div>

              <input
                value={geminiModel}
                onChange={(event) =>
                  setGeminiModel(
                    event.target.value
                  )
                }
                className={`${inputClass} w-full`}
                placeholder="gemini-2.5-flash"
              />

              <input
                value={geminiApiKey}
                onChange={(event) =>
                  setGeminiApiKey(
                    event.target.value
                  )
                }
                className={`${inputClass} w-full`}
                placeholder="Gemini API key"
                type="password"
              />

              <div className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-white">
                Demo mode: the API key is stored only in this browser localStorage.
                For production, use a backend proxy instead of exposing keys in the frontend.
              </div>

              {geminiStatus && (
                <div className="rounded-lg border border-white bg-black p-2 text-[10px] leading-4 text-white">
                  {geminiStatus}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white bg-black p-3">
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={[
                  "max-w-[90%] rounded-xl border p-2 leading-5",
                  message.role === "user"
                    ? "self-end border-white bg-white text-black"
                    : "self-start border-white bg-black text-white",
                ].join(" ")}
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

            <div ref={scrollRef} />
          </div>
        </div>

        <div className="flex gap-2">
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

        <div className="rounded-xl border border-white bg-black p-2 text-[10px] leading-4 text-white">
          Layered mode: rules + structured memory + local ML emotion classifier + optional Gemini fallback.
          Gemini is only used when both local layers are not confident.
        </div>
      </div>
    </SensorCard>
  );
};


export default RobotChatWidget;
