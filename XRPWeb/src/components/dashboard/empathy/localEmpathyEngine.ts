export type LocalEmpathyEmotionKey =
  | "idle"
  | "happy"
  | "sad"
  | "upset"
  | "excited"
  | "in_love";


export type LocalEmpathyDecision = {
  emotionId: number;
  emotionLabel: string;
  confidence: number;
  reason: string;
};


export type LocalEmpathyResult = {
  matched: boolean;
  emotionKey: LocalEmpathyEmotionKey;
  decision: LocalEmpathyDecision;
  reply: string;
  reason: string;
};


type EmpathyRule = {
  emotionKey: Exclude<
    LocalEmpathyEmotionKey,
    "idle"
  >;
  emotionId: number;
  emotionLabel: string;
  confidence: number;
  patterns: RegExp[];
  reply: (
    displayName?: string
  ) => string;
  reason: string;
};


const BLOCKED_DISPLAY_NAMES =
  new Set([
    "i",
    "im",
    "i'm",
    "me",
    "my",
    "mine",
    "you",
    "your",
    "he",
    "she",
    "they",
    "we",
    "us",
    "the",
    "this",
    "that",
    "it",
    "am",
    "is",
    "are",
    "sad",
    "happy",
    "worried",
    "nervous",
    "angry",
    "upset",
    "sick",
    "bad",
    "good",
    "hello",
    "hi",
  ]);


function normalizeText(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function safeDisplayName(
  displayName?: string
): string | undefined {
  const clean =
    displayName?.trim();

  if (!clean) {
    return undefined;
  }

  const normalized =
    normalizeText(clean);

  if (
    BLOCKED_DISPLAY_NAMES.has(normalized) ||
    normalized.length < 2
  ) {
    return undefined;
  }

  return clean;
}


function namePrefix(
  displayName?: string
): string {
  const safeName =
    safeDisplayName(displayName);

  return safeName
    ? `${safeName}, `
    : "";
}


function worriedReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}I'm sorry you're feeling worried. That sounds really hard, and I'm here with you.`;
}


function sadReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}I'm sorry you're feeling this way. That sounds difficult, but you don't have to go through it alone.`;
}


function nervousReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}I'm sorry you're feeling nervous. Let's slow it down and take one calm step at a time.`;
}


function frustratedReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}that sounds frustrating. Let's slow it down and take one small step at a time.`;
}


function happyReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}I'm glad to hear that. That sounds like a good moment.`;
}


function excitedReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}that sounds exciting. I'm happy for you.`;
}


function friendlyReply(
  displayName?: string
): string {
  return `${namePrefix(displayName)}aww, I like being your robot friend too.`;
}


const RULES:
  EmpathyRule[] = [
    {
      emotionKey: "sad",
      emotionId: 9,
      emotionLabel: "Sad",
      confidence: 0.9,
      patterns: [
        /\b(?:i\s+am|im|i\s+feel|i\s+felt)\s+(worried|worrying|scared|afraid|anxious)\b/i,
        /\bworried\s+about\b/i,
        /\bi\s+(worry|worrying)\b/i,
        /\b(my|our)\s+(dog|cat|pet|puppy|kitten|father|mother|mom|dad|friend|brother|sister|family|grandma|grandpa|teacher)\s+(is|got|feels|felt|seems)\s+(sick|ill|hurt|injured|bad)\b/i,
        /\b(someone|somebody|a person)\s+(is|got|feels|felt|seems)\s+(sick|ill|hurt|injured|bad)\b/i,
      ],
      reply:
        worriedReply,
      reason:
        "The user mentioned worry, fear, anxiety, or concern about someone/something being unwell.",
    },
    {
      emotionKey: "sad",
      emotionId: 9,
      emotionLabel: "Sad",
      confidence: 0.86,
      patterns: [
        /\bi\s+(had|got)\s+a?\s*(bad|terrible|awful)\s+(exam|test|quiz|grade|score)\b/i,
        /\bi\s+(failed|lost|missed)\s+(my\s+)?(exam|test|quiz|class|homework)\b/i,
        /\b(exam|test|quiz|homework|school)\s+(went|was)\s+(bad|terrible|awful)\b/i,
        /\b(?:i\s+am|im|i\s+feel|i\s+felt)\s+(sad|down|lonely|alone|disappointed|depressed)\b/i,
        /\bi\s+(cried|was crying|want to cry)\b/i,
      ],
      reply:
        sadReply,
      reason:
        "The user described sadness, disappointment, loneliness, crying, or a difficult academic event.",
    },
    {
      emotionKey: "upset",
      emotionId: 8,
      emotionLabel: "Upset",
      confidence: 0.82,
      patterns: [
        /\b(?:i\s+am|im|i\s+feel|i\s+felt)\s+(angry|mad|upset|frustrated|annoyed|stressed|overwhelmed)\b/i,
        /\b(this|that|it)\s+(is|was)\s+(frustrating|annoying|stressful|overwhelming)\b/i,
        /\bmy\s+(code|project|homework|robot|app)\s+(does not|doesn't|did not|didn't|won't|will not)\s+(work|compile|run)\b/i,
        /\bi\s+(cannot|can't|could not|couldn't)\s+(do|finish|solve|understand)\b/i,
      ],
      reply:
        frustratedReply,
      reason:
        "The user described frustration, stress, anger, or being overwhelmed.",
    },
    {
      emotionKey: "sad",
      emotionId: 9,
      emotionLabel: "Sad",
      confidence: 0.78,
      patterns: [
        /\b(my|our)\s+(team|country|club|class|group)\s+(lost|failed)\b/i,
        /\b(colombia|team|country|club)\s+(lost|failed)\b/i,
        /\bwe\s+(lost|failed)\b/i,
      ],
      reply:
        sadReply,
      reason:
        "The user mentioned losing or failing in a team/country/group context.",
    },
    {
      emotionKey: "sad",
      emotionId: 9,
      emotionLabel: "Sad",
      confidence: 0.8,
      patterns: [
        /\b(?:i\s+am|im|i\s+feel|i\s+felt)\s+(nervous|afraid|scared)\b/i,
        /\bi\s+(have|had)\s+(anxiety|fear)\b/i,
      ],
      reply:
        nervousReply,
      reason:
        "The user described fear, nervousness, or anxiety.",
    },
    {
      emotionKey: "happy",
      emotionId: 1,
      emotionLabel: "Happy",
      confidence: 0.8,
      patterns: [
        /\b(?:i\s+am|im|i\s+feel|i\s+felt)\s+(happy|good|great|proud|better)\b/i,
        /\b(today|this)\s+(was|is)\s+(good|great|amazing|nice)\b/i,
        /\bi\s+(passed|won|finished|did well)\b/i,
      ],
      reply:
        happyReply,
      reason:
        "The user described feeling good, proud, winning, passing, or doing well.",
    },
    {
      emotionKey: "excited",
      emotionId: 3,
      emotionLabel: "Excited",
      confidence: 0.8,
      patterns: [
        /\b(?:i\s+am|im|i\s+feel)\s+(excited|super excited|so excited)\b/i,
        /\bi\s+(can't wait|cannot wait)\b/i,
        /\bthat\s+(is|was)\s+(awesome|amazing|incredible|fantastic)\b/i,
      ],
      reply:
        excitedReply,
      reason:
        "The user described excitement or very positive anticipation.",
    },
    {
      emotionKey: "in_love",
      emotionId: 12,
      emotionLabel: "In love",
      confidence: 0.78,
      patterns: [
        /\bi\s+(like|love)\s+(working|talking|playing)\s+with\s+you\b/i,
        /\byou\s+(are|'re)\s+(my\s+)?(friend|best friend)\b/i,
        /\bi\s+(like|love)\s+you\b/i,
      ],
      reply:
        friendlyReply,
      reason:
        "The user expressed affection or friendship toward the robot.",
    },
  ];


export function inferLocalEmpathy(
  text: string,
  displayName?: string
): LocalEmpathyResult {
  const normalized =
    normalizeText(text);

  const matchedRule =
    RULES.find((rule) =>
      rule.patterns.some((pattern) =>
        pattern.test(normalized)
      )
    );

  if (!matchedRule) {
    return {
      matched: false,
      emotionKey: "idle",
      decision: {
        emotionId: 0,
        emotionLabel: "Idle",
        confidence: 0.2,
        reason:
          "No local empathy rule matched.",
      },
      reply:
        "I am listening.",
      reason:
        "No local empathy rule matched.",
    };
  }

  return {
    matched: true,
    emotionKey:
      matchedRule.emotionKey,
    decision: {
      emotionId:
        matchedRule.emotionId,
      emotionLabel:
        matchedRule.emotionLabel,
      confidence:
        matchedRule.confidence,
      reason:
        `Local empathy engine: ${matchedRule.reason}`,
    },
    reply:
      matchedRule.reply(displayName),
    reason:
      matchedRule.reason,
  };
}


export function shouldPreferLocalEmpathy(
  result: LocalEmpathyResult
): boolean {
  return (
    result.matched &&
    result.decision.confidence >= 0.72
  );
}


export function isWeakLocalReply(
  reply: string,
  decision: LocalEmpathyDecision
): boolean {
  const normalized =
    normalizeText(reply);

  return (
    normalized === "i am listening" ||
    normalized.startsWith("i am listening,") ||
    (
      decision.emotionLabel === "Idle" &&
      decision.confidence < 0.58
    )
  );
}
