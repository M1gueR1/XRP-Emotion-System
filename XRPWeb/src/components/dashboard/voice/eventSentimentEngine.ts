import {
  normalizeTranscript,
} from "./emotionIntentEngine";

import type {
  VoiceCommandResult,
} from "./voiceCommandTypes";


type EventEmotion =
  | "sad"
  | "happy"
  | "excited"
  | "in_love"
  | "upset";


type EventSentimentRule = {
  id: string;
  emotion: EventEmotion;
  confidenceScore: number;
  reason: string;
  requiredAny: string[];
  contextAny?: string[];
  blockedAny?: string[];
};


type EventSentimentMatch = {
  rule: EventSentimentRule;
  matchedTriggers: string[];
  matchedContext: string[];
};


function includesAny(
  normalized: string,
  words: string[]
): string[] {
  return words.filter((word) =>
    normalized.includes(word)
  );
}


function hasAny(
  normalized: string,
  words: string[]
): boolean {
  return includesAny(
    normalized,
    words
  ).length > 0;
}


function actionForEmotion(
  emotion: EventEmotion
): VoiceCommandResult["action"] {
  switch (emotion) {
    case "sad":
      return "turn_sad";

    case "happy":
      return "turn_happy";

    case "excited":
      return "turn_excited";

    case "in_love":
      return "turn_in_love";

    case "upset":
      return "turn_upset";
  }
}


function labelForEmotion(
  emotion: EventEmotion
): string {
  switch (emotion) {
    case "sad":
      return "Sad";

    case "happy":
      return "Happy";

    case "excited":
      return "Excited";

    case "in_love":
      return "In love";

    case "upset":
      return "Upset";
  }
}


function repeatWordsForEmotion(
  emotion: EventEmotion
): string[] {
  switch (emotion) {
    case "sad":
      return [
        "sad",
        "triste",
      ];

    case "happy":
      return [
        "happy",
        "feliz",
      ];

    case "excited":
      return [
        "excited",
        "wow",
        "emocionado",
      ];

    case "in_love":
      return [
        "love",
        "friend",
        "enamorado",
        "enamorada",
      ];

    case "upset":
      return [
        "upset",
        "angry",
        "mad",
        "stressed",
        "frustrated",
      ];
  }
}


function repeatedEmotionCount(
  normalized: string,
  emotion: EventEmotion
): number {
  const words =
    normalized
      .split(" ")
      .filter(Boolean);

  const targets =
    new Set(
      repeatWordsForEmotion(
        emotion
      )
    );

  const count =
    words.filter((word) =>
      targets.has(word)
    ).length;

  return Math.min(
    Math.max(
      count,
      1
    ),
    3
  );
}


const SPORTS_CONTEXT = [
  "match",
  "game",
  "final",
  "tournament",
  "championship",
  "cup",
  "goal",
  "score",
  "team",
  "soccer",
  "football",
  "basketball",
  "colombia",
  "millonarios",
  "nacional",
  "america",
  "partido",
  "juego",
  "torneo",
  "campeonato",
  "copa",
  "gol",
  "equipo",
  "futbol",
  "baloncesto",
];


const SCHOOL_CONTEXT = [
  "exam",
  "test",
  "quiz",
  "class",
  "homework",
  "assignment",
  "project",
  "presentation",
  "grade",
  "school",
  "university",
  "teacher",
  "professor",
  "parcial",
  "examen",
  "clase",
  "tarea",
  "trabajo",
  "proyecto",
  "presentacion",
  "nota",
  "colegio",
  "universidad",
  "profesor",
  "profe",
];


const TECH_CONTEXT = [
  "code",
  "program",
  "robot",
  "dashboard",
  "app",
  "build",
  "compile",
  "error",
  "bug",
  "test",
  "project",
  "codigo",
  "programa",
  "aplicacion",
  "compilar",
  "prueba",
  "proyecto",
];


const SOCIAL_CONTEXT = [
  "friend",
  "friends",
  "family",
  "team",
  "partner",
  "teacher",
  "classmate",
  "amigo",
  "amiga",
  "amigos",
  "familia",
  "equipo",
  "compañero",
  "compañera",
  "profe",
];


const EVENT_SENTIMENT_RULES:
  EventSentimentRule[] = [
    {
      id: "event.sports_lost",
      emotion: "sad",
      confidenceScore: 0.86,
      reason:
        "negative sports event",
      requiredAny: [
        "lost",
        "lose",
        "losing",
        "defeated",
        "eliminated",
        "missed",
        "perdio",
        "perdió",
        "perdimos",
        "perder",
        "eliminado",
        "eliminada",
      ],
      contextAny:
        SPORTS_CONTEXT,
      blockedAny: [
        "not lost",
        "did not lose",
        "didnt lose",
        "no perdio",
        "no perdió",
      ],
    },

    {
      id: "event.sports_won",
      emotion: "excited",
      confidenceScore: 0.88,
      reason:
        "positive sports event",
      requiredAny: [
        "won",
        "win",
        "winning",
        "scored",
        "qualified",
        "champion",
        "gano",
        "ganó",
        "ganamos",
        "victoria",
        "clasifico",
        "clasificó",
        "campeon",
        "campeón",
      ],
      contextAny:
        SPORTS_CONTEXT,
      blockedAny: [
        "did not win",
        "didnt win",
        "not win",
        "no gano",
        "no ganó",
      ],
    },

    {
      id: "event.school_failed",
      emotion: "sad",
      confidenceScore: 0.84,
      reason:
        "negative academic event",
      requiredAny: [
        "failed",
        "fail",
        "lost my exam",
        "bad grade",
        "low grade",
        "perdi el examen",
        "perdí el examen",
        "perdi el parcial",
        "perdí el parcial",
        "me fue mal",
        "mala nota",
        "baja nota",
        "reprobe",
        "reprobé",
      ],
      contextAny:
        SCHOOL_CONTEXT,
      blockedAny: [
        "did not fail",
        "didnt fail",
        "not failed",
        "no perdi",
        "no perdí",
      ],
    },

    {
      id: "event.school_passed",
      emotion: "happy",
      confidenceScore: 0.84,
      reason:
        "positive academic event",
      requiredAny: [
        "passed",
        "pass",
        "good grade",
        "high grade",
        "finished my homework",
        "finished my project",
        "pase",
        "pasé",
        "aprobe",
        "aprobé",
        "buena nota",
        "me fue bien",
        "termine",
        "terminé",
      ],
      contextAny:
        SCHOOL_CONTEXT,
      blockedAny: [
        "did not pass",
        "didnt pass",
        "not pass",
        "no pase",
        "no pasé",
      ],
    },

    {
      id: "event.tech_broken",
      emotion: "sad",
      confidenceScore: 0.82,
      reason:
        "negative technical event",
      requiredAny: [
        "broken",
        "not working",
        "does not work",
        "doesnt work",
        "crashed",
        "error",
        "bug",
        "failed build",
        "build failed",
        "broke",
        "roto",
        "no funciona",
        "fallo",
        "falló",
      ],
      contextAny:
        TECH_CONTEXT,
    },

    {
      id: "event.tech_working",
      emotion: "excited",
      confidenceScore: 0.84,
      reason:
        "positive technical event",
      requiredAny: [
        "working",
        "works",
        "fixed",
        "compiled",
        "build passed",
        "test passed",
        "funciona",
        "sirve",
        "arregle",
        "arreglé",
        "compilo",
        "compiló",
        "paso la prueba",
        "pasó la prueba",
      ],
      contextAny:
        TECH_CONTEXT,
      blockedAny: [
        "not working",
        "does not work",
        "doesnt work",
        "no funciona",
      ],
    },

    {
      id: "event.interpersonal_negative",
      emotion: "upset",
      confidenceScore: 0.93,
      reason:
        "negative interpersonal statement",
      requiredAny: [
        "i hate you",
        "i do not like you",
        "i dont like you",
        "i don't like you",
        "you are mean",
        "youre mean",
        "you're mean",
        "you are bad",
        "youre bad",
        "you're bad",
        "bad robot",
        "you hurt me",
        "you make me angry",
        "you make me mad",
        "i am angry with you",
        "im angry with you",
        "i am mad at you",
        "im mad at you",
        "te odio",
        "no me gustas",
        "eres malo",
        "eres mala",
        "me hiciste daño",
        "me haces enojar",
      ],
    },

    {
      id: "event.social_helped",
      emotion: "in_love",
      confidenceScore: 0.80,
      reason:
        "positive social/support event",
      requiredAny: [
        "helped me",
        "supports me",
        "trust you",
        "care about me",
        "was kind",
        "me ayudo",
        "me ayudó",
        "me apoya",
        "confio en ti",
        "confío en ti",
        "fue amable",
      ],
      contextAny:
        SOCIAL_CONTEXT,
    },

    {
      id: "event.social_conflict",
      emotion: "sad",
      confidenceScore: 0.80,
      reason:
        "negative social event",
      requiredAny: [
        "argued",
        "fight",
        "angry with me",
        "ignored me",
        "left me",
        "pelee",
        "peleé",
        "pelea",
        "me ignoro",
        "me ignoró",
        "se fue",
        "enojado conmigo",
        "enojada conmigo",
      ],
      contextAny:
        SOCIAL_CONTEXT,
    },
  ];


function matchRule(
  normalized: string,
  rule: EventSentimentRule
): EventSentimentMatch | null {
  if (
    rule.blockedAny &&
    hasAny(
      normalized,
      rule.blockedAny
    )
  ) {
    return null;
  }

  const matchedTriggers =
    includesAny(
      normalized,
      rule.requiredAny
    );

  if (
    matchedTriggers.length === 0
  ) {
    return null;
  }

  const matchedContext =
    includesAny(
      normalized,
      rule.contextAny ?? []
    );

  if (
    rule.contextAny &&
    rule.contextAny.length > 0 &&
    matchedContext.length === 0
  ) {
    return null;
  }

  return {
    rule,
    matchedTriggers,
    matchedContext,
  };
}


function buildEventResult(
  normalized: string,
  rule: EventSentimentRule,
  triggerText: string,
  contextText: string
): VoiceCommandResult {
  const reason =
    contextText
      ? `${rule.reason}: ${triggerText} + ${contextText}`
      : `${rule.reason}: ${triggerText}`;

  return {
    transcript:
      normalized,

    action:
      actionForEmotion(
        rule.emotion
      ),

    confidenceLabel:
      `Event sentiment detected ${reason}`,

    repeatCount:
      repeatedEmotionCount(
        normalized,
        rule.emotion
      ),

    source:
      "event_sentiment",

    matchedRuleId:
      rule.id,

    intentLabel:
      labelForEmotion(
        rule.emotion
      ),

    intentCategory:
      "emotion",

    confidenceScore:
      rule.confidenceScore,
  };
}


export function inferEventSentiment(
  transcript: string
): VoiceCommandResult | null {
  const normalized =
    normalizeTranscript(
      transcript
    );

  if (!normalized) {
    return null;
  }

  for (const rule of EVENT_SENTIMENT_RULES) {
    const match =
      matchRule(
        normalized,
        rule
      );

    if (!match) {
      continue;
    }

    const triggerText =
      match.matchedTriggers
        .slice(0, 2)
        .join(", ");

    const contextText =
      match.matchedContext
        .slice(0, 2)
        .join(", ");

    return buildEventResult(
      normalized,
      match.rule,
      triggerText,
      contextText
    );
  }

  return null;
}
