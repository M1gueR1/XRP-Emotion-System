import {
  type UserMemoryEmotion,
  type UserMemoryKind,
  type UserPreferencePolarity,
  type UserProfile,
} from "../profiles/userProfileStore";


export type GeminiMemoryDraft = {
  kind: UserMemoryKind;
  field?: string;
  value?: string;
  target?: string;
  polarity?: UserPreferencePolarity;
  emotion?: UserMemoryEmotion;
  intensity?: number;
  sourceText?: string;
};


export type GeminiRobotChatResponse = {
  reply: string;
  emotionKey:
    | "idle"
    | "happy"
    | "sad"
    | "excited"
    | "in_love"
    | "upset";
  reactionIntensity: 1 | 2 | 3;
  confidence: number;
  reason: string;
  displayName?: string;
  profileUpdates: GeminiMemoryDraft[];
};


export type GeminiRobotChatInput = {
  apiKey: string;
  model: string;
  message: string;
  activeProfile: UserProfile | null;
  recentMessages: Array<{
    role: "user" | "robot";
    text: string;
  }>;
};


const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";


function clampConfidence(
  value: unknown
): number {
  if (typeof value !== "number") {
    return 0.5;
  }

  return Math.min(
    1,
    Math.max(0, value)
  );
}


function cleanModelName(
  model: string
): string {
  const trimmed =
    model
      .trim()
      .replace(/^models\//, "");

  return trimmed || "gemini-2.5-flash";
}


function safeJsonParse(
  text: string
): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const firstBrace =
      text.indexOf("{");

    const lastBrace =
      text.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1 ||
      lastBrace <= firstBrace
    ) {
      throw new Error(
        "Gemini did not return valid JSON."
      );
    }

    return JSON.parse(
      text.slice(
        firstBrace,
        lastBrace + 1
      )
    );
  }
}


function normalizeEmotionKey(
  value: unknown
): GeminiRobotChatResponse["emotionKey"] {
  if (
    value === "happy" ||
    value === "sad" ||
    value === "excited" ||
    value === "in_love" ||
    value === "upset" ||
    value === "idle"
  ) {
    return value;
  }

  return "idle";
}


function normalizeReactionIntensity(
  value: unknown
): 1 | 2 | 3 {
  if (value === 3) {
    return 3;
  }

  if (value === 2) {
    return 2;
  }

  return 1;
}


function normalizeMemoryKind(
  value: unknown
): UserMemoryKind | null {
  if (
    value === "identity" ||
    value === "preference" ||
    value === "activity" ||
    value === "study" ||
    value === "work" ||
    value === "role" ||
    value === "skill" ||
    value === "trait" ||
    value === "emotional_trigger" ||
    value === "note"
  ) {
    return value;
  }

  return null;
}


function normalizePolarity(
  value: unknown
): UserPreferencePolarity | undefined {
  if (
    value === "like" ||
    value === "love" ||
    value === "prefer" ||
    value === "dislike" ||
    value === "hate"
  ) {
    return value;
  }

  return undefined;
}


function normalizeEmotion(
  value: unknown
): UserMemoryEmotion | undefined {
  if (
    value === "happy" ||
    value === "sad" ||
    value === "excited" ||
    value === "upset" ||
    value === "in_love"
  ) {
    return value;
  }

  return undefined;
}


function normalizeMemoryDrafts(
  value: unknown
): GeminiMemoryDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): GeminiMemoryDraft | null => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const record =
        item as Record<string, unknown>;

      const kind =
        normalizeMemoryKind(
          record.kind
        );

      if (!kind) {
        return null;
      }

      return {
        kind,
        field:
          typeof record.field === "string"
            ? record.field
            : undefined,
        value:
          typeof record.value === "string"
            ? record.value
            : undefined,
        target:
          typeof record.target === "string"
            ? record.target
            : undefined,
        polarity:
          normalizePolarity(
            record.polarity
          ),
        emotion:
          normalizeEmotion(
            record.emotion
          ),
        intensity:
          typeof record.intensity === "number"
            ? Math.min(
                1,
                Math.max(
                  0.05,
                  record.intensity
                )
              )
            : undefined,
        sourceText:
          typeof record.sourceText === "string"
            ? record.sourceText
            : undefined,
      };
    })
    .filter(
      (
        item
      ): item is GeminiMemoryDraft =>
        item !== null
    );
}


function normalizeGeminiResponse(
  raw: unknown
): GeminiRobotChatResponse {
  if (
    !raw ||
    typeof raw !== "object"
  ) {
    throw new Error(
      "Gemini returned an invalid response."
    );
  }

  const record =
    raw as Record<string, unknown>;

  return {
    reply:
      typeof record.reply === "string" &&
      record.reply.trim()
        ? record.reply.trim()
        : "I am listening.",

    emotionKey:
      normalizeEmotionKey(
        record.emotionKey
      ),

    reactionIntensity:
      normalizeReactionIntensity(
        record.reactionIntensity
      ),

    confidence:
      clampConfidence(
        record.confidence
      ),

    reason:
      typeof record.reason === "string"
        ? record.reason
        : "Gemini interpreted the message.",

    displayName:
      typeof record.displayName === "string"
        ? record.displayName.trim()
        : undefined,

    profileUpdates:
      normalizeMemoryDrafts(
        record.profileUpdates
      ),
  };
}


function profileSummary(
  profile: UserProfile | null
): string {
  if (!profile) {
    return "No active profile.";
  }

  const memory =
    profile.memoryItems
      .map((item) => ({
        kind: item.kind,
        field: item.field,
        value: item.value,
        target: item.target,
        polarity: item.polarity,
        emotion: item.emotion,
        intensity: item.intensity,
      }))
      .slice(-20);

  return JSON.stringify(
    {
      id: profile.id,
      displayName:
        profile.displayName,
      memory,
    },
    null,
    2
  );
}


function recentConversationSummary(
  messages: GeminiRobotChatInput["recentMessages"]
): string {
  return messages
    .slice(-8)
    .map(
      (message) =>
        `${message.role}: ${message.text}`
    )
    .join("\n");
}


function buildGeminiPrompt(
  input: GeminiRobotChatInput
): string {
  return `You are the reasoning layer for a small educational social robot called XRP Robot.

Your job:
1. Understand the student's message.
2. Update structured memory when the student shares personal information.
3. Answer naturally and personally.
4. Choose one emotion from the robot's existing emotion set.
5. Return ONLY valid JSON. No markdown.

Existing robot emotions:
- idle
- happy
- sad
- excited
- in_love
- upset

Structured memory schema:
profileUpdates is an array. Each item must use one of:
- identity: { kind:"identity", field:string, value:string, intensity:number, sourceText:string }
- preference: { kind:"preference", target:string, polarity:"like"|"love"|"prefer"|"dislike"|"hate", intensity:number, sourceText:string }
- activity: { kind:"activity", target:string, intensity:number, sourceText:string }
- study: { kind:"study", field:"studies", value:string, intensity:number, sourceText:string }
- work: { kind:"work", field:"occupation", value:string, intensity:number, sourceText:string }
- role: { kind:"role", field:"role", value:string, intensity:number, sourceText:string }
- skill: { kind:"skill", field:"skill", value:string, intensity:number, sourceText:string }
- trait: { kind:"trait", field:"trait", value:string, intensity:number, sourceText:string }
- emotional_trigger: { kind:"emotional_trigger", target:string, emotion:"happy"|"sad"|"excited"|"upset"|"in_love", intensity:number, sourceText:string }
- note: { kind:"note", value:string, intensity:number, sourceText:string }

Important rules:
- Do NOT invent memory.
- Do NOT save questions as memory.
- "I am from Colombia" is origin, NOT a name.
- Only set displayName when the user clearly says a name: "Hi I'm Santiago", "My name is Santiago", "Soy Santiago", "Me llamo Santiago".
- Understand intensity:
  "like" ≈ 0.55
  "really like" ≈ 0.70
  "love" ≈ 0.85
  "really love" ≈ 0.95
  "dislike" ≈ 0.65
  "hate" ≈ 0.85
  "really hate" ≈ 0.95
- If the user says "Colombia won", that is positive/excited, especially if they are from Colombia.
- If the user says "Colombia lost", that is sad, especially if they are from Colombia or saved memory says Colombia losing makes them sad.
- If the user asks "Do I like X?", answer using memory. Do not store it as a new preference.
- If memory is missing, say you don't know yet.

Return JSON exactly like:
{
  "reply": "short natural reply",
  "emotionKey": "idle|happy|sad|excited|in_love|upset",
  "reactionIntensity": 1,
  "confidence": 0.0,
  "reason": "short reason",
  "displayName": "optional name if clearly provided",
  "profileUpdates": []
}

Active profile:
${profileSummary(input.activeProfile)}

Recent conversation:
${recentConversationSummary(input.recentMessages)}

Current student message:
${input.message}`;
}


export async function askGeminiRobotChat(
  input: GeminiRobotChatInput
): Promise<GeminiRobotChatResponse> {
  const apiKey =
    input.apiKey.trim();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing."
    );
  }

  const model =
    cleanModelName(input.model);

  const response =
    await fetch(
      `${GEMINI_API_BASE}/${encodeURIComponent(
        model
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "X-goog-api-key":
            apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    buildGeminiPrompt(
                      input
                    ),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType:
              "application/json",
          },
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Gemini request failed (${response.status}): ${errorText.slice(
        0,
        240
      )}`
    );
  }

  const data =
    await response.json();

  const text =
    data?.candidates?.[0]?.content
      ?.parts?.[0]?.text;

  if (typeof text !== "string") {
    throw new Error(
      "Gemini response did not include text."
    );
  }

  return normalizeGeminiResponse(
    safeJsonParse(text)
  );
}
