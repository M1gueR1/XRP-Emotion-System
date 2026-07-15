import type {
  LocalLlmChatResponse,
  LocalLlmEmotionKey,
} from "./localLlmTypes";


const ALLOWED_EMOTIONS = new Set<LocalLlmEmotionKey>([
  "idle",
  "happy",
  "sad",
  "upset",
  "excited",
  "in_love",
]);

const MAX_REPLY_LENGTH = 240;
const MAX_REASON_LENGTH = 160;

const EMOTION_ALIASES: Record<string, LocalLlmEmotionKey> = {
  amazed: "excited",
  angry: "upset",
  anxious: "upset",
  calm: "idle",
  celebration: "excited",
  cheerful: "happy",
  chuckled: "happy",
  confused: "idle",
  curious: "idle",
  delighted: "happy",
  excited: "excited",
  frustrated: "upset",
  glad: "happy",
  happy: "happy",
  idle: "idle",
  in_love: "in_love",
  inlove: "in_love",
  joy: "happy",
  joyful: "happy",
  love: "in_love",
  love_it: "in_love",
  neutral: "idle",
  ok: "idle",
  okay: "idle",
  puzzled: "idle",
  ready_to_race: "excited",
  sad: "sad",
  surprised: "excited",
  upset: "upset",
  worried: "upset",
};


export class LocalLlmParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalLlmParseError";
  }
}


function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (character === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
}


function normalizeShortText(
  value: string,
  maximumLength: number
): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maximumLength) {
    return normalized;
  }

  const shortened = normalized.slice(0, maximumLength - 1).trimEnd();
  return `${shortened}…`;
}


function normalizeEmotionKey(
  value: unknown
): LocalLlmEmotionKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z_]/g, "");

  if (ALLOWED_EMOTIONS.has(normalized as LocalLlmEmotionKey)) {
    return normalized as LocalLlmEmotionKey;
  }

  return EMOTION_ALIASES[normalized] ?? null;
}


function inferEmotionKeyFromReply(reply: string): LocalLlmEmotionKey {
  const normalized = reply.toLowerCase();

  if (/\b(sorry|sad|worried|hard|miss|lost)\b/.test(normalized)) {
    return "sad";
  }

  if (/\b(great|awesome|excited|congrat|won|amazing)\b/.test(normalized)) {
    return "excited";
  }

  if (/\b(hi|hello|hey|nice|happy|glad)\b/.test(normalized)) {
    return "happy";
  }

  return "idle";
}


function normalizeConfidence(
  value: unknown
): number | null {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.min(1, Math.max(0, numericValue));
}


function validateParsedValue(value: unknown): LocalLlmChatResponse {
  if (!value || typeof value !== "object") {
    throw new LocalLlmParseError("The local model did not return a JSON object.");
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.reply !== "string" || !candidate.reply.trim()) {
    throw new LocalLlmParseError("The local model returned an empty reply.");
  }

  const reply = normalizeShortText(candidate.reply, MAX_REPLY_LENGTH);

  const emotionKey =
    normalizeEmotionKey(
      candidate.emotionKey ??
      candidate.emotion
    ) ?? inferEmotionKeyFromReply(reply);

  const confidence =
    normalizeConfidence(
      candidate.confidence
    ) ?? 0.55;

  const reason = typeof candidate.reason === "string" && candidate.reason.trim()
    ? candidate.reason
    : "The browser-local model generated a direct reply.";

  return {
    reply,
    emotionKey,
    confidence,
    reason: normalizeShortText(reason, MAX_REASON_LENGTH),
  };
}


export function parseLocalLlmOutput(text: string): LocalLlmChatResponse {
  const candidates = extractJsonObjects(text);
  let validationError: LocalLlmParseError | null = null;

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      return validateParsedValue(JSON.parse(candidates[index]));
    } catch (error) {
      if (error instanceof LocalLlmParseError) {
        validationError = error;
      }
      if (!(error instanceof SyntaxError) && !(error instanceof LocalLlmParseError)) {
        throw error;
      }
    }
  }

  if (validationError) {
    const trimmed = normalizeShortText(text, MAX_REPLY_LENGTH);
    if (trimmed) {
      return {
        reply: trimmed,
        emotionKey: inferEmotionKeyFromReply(trimmed),
        confidence: 0.45,
        reason: validationError.message,
      };
    }
    throw validationError;
  }

  const trimmed = normalizeShortText(text, MAX_REPLY_LENGTH);
  if (trimmed) {
    return {
      reply: trimmed,
      emotionKey: inferEmotionKeyFromReply(trimmed),
      confidence: 0.45,
      reason: "The browser-local model returned plain text instead of JSON.",
    };
  }

  throw new LocalLlmParseError("The local model response did not contain valid response JSON.");
}
