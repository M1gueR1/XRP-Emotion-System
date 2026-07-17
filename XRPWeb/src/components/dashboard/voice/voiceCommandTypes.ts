export type OfficialVoiceCommandAction =
  | "turn_right"
  | "turn_left"
  | "turn_back"
  | "turn_happy"
  | "turn_sad"
  | "turn_excited"
  | "turn_in_love"
  | "turn_idle"
  | "turn_upset"
  | "stop"
  | "showtime"
  | "go_to_sleep"
  | "lets_play"
  | "unknown";


export type CustomVoiceCommandKey =
  `custom:${number}`;


export type VoiceCommandAction =
  | OfficialVoiceCommandAction
  | CustomVoiceCommandKey;


export type VoiceIntentCategory =
  | "emotion"
  | "movement"
  | "macro"
  | "safety"
  | "unknown";


export type VoiceIntentSource =
  | "intent_engine"
  | "event_sentiment"
  | "advanced_reasoner"
  | "semantic_ml"
  | "custom_voice_keyword";


export type CustomVoiceCommandMetadata = {
  commandId: number;
  commandKey: CustomVoiceCommandKey;
  phrase: string;
  automaticallyPlayEmotion: boolean;
  targetEmotionId: number;
  targetEmotionUniqueName: string;
  targetEmotionDisplayName: string;
  targetEmotionSource:
    | "official"
    | "custom";
  targetMissing: boolean;
};


export type VoiceDecisionCandidate = {
  source: VoiceIntentSource;
  action: VoiceCommandAction;
  intentLabel: string;
  confidenceScore: number;
  adjustedScore: number;
  matchedRuleId: string | null;
  reason: string;
};


export interface VoiceCommandResult {
  transcript: string;
  action: VoiceCommandAction;
  confidenceLabel: string;
  repeatCount: number;

  source: VoiceIntentSource;
  matchedRuleId: string | null;

  /*
   * Demo 2 metadata.
   *
   * These fields make the behavior easier to explain:
   * the robot is not only matching a command, it is
   * inferring an intent with a confidence score.
   */
  intentLabel: string;
  intentCategory: VoiceIntentCategory;
  confidenceScore: number;

  /*
   * Optional semantic ML metadata.
   * Filled only when the semantic model is used.
   */
  semanticMatchText?: string;
  semanticSimilarity?: number;
  semanticModelId?: string;

  /*
   * Optional conversation-context metadata.
   * Filled when the dashboard uses short-term context
   * from the same interaction.
   */
  contextSubject?: string;
  contextReason?: string;

  /*
   * Optional advanced-reasoner metadata.
   * Filled when the broader emotion reasoner is used.
   */
  advancedIntentLabel?: string;
  advancedMatchedPrototype?: string;
  advancedSimilarity?: number;

  /*
   * Optional decision-router metadata.
   * Filled when multiple emotion candidates are compared.
   */
  decisionCandidates?: VoiceDecisionCandidate[];
  decisionReason?: string;

  /* Present only for student-created voice keywords. */
  customCommand?: CustomVoiceCommandMetadata;
}
