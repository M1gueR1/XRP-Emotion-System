import type {
  VoiceCommandResult,
  VoiceDecisionCandidate,
  VoiceIntentSource,
} from "./voiceCommandTypes";


type CandidateSourceWeight =
  Record<
    VoiceIntentSource,
    number
  >;


const SOURCE_WEIGHTS:
  CandidateSourceWeight = {
    /*
     * Direct intent_engine results are usually returned
     * before the router. This value is here for safety.
     */
    intent_engine: 0.12,

    /*
     * Event sentiment is strong for concrete real-world
     * events such as won/lost, passed/failed, working/broken.
     */
    event_sentiment: 0.10,

    /*
     * Advanced reasoner is broader and better for ambiguous
     * conversational input like studying, stress, focus, etc.
     */
    advanced_reasoner: 0.07,

    /*
     * Semantic ML is useful, but it can sometimes choose a
     * close example that is not the best emotional decision.
     */
    semantic_ml: 0.04,
  };


function actionBias(
  result: VoiceCommandResult
): number {
  /*
   * Idle should be the safe fallback, but it should not beat
   * a clear emotional candidate unless the emotional candidate
   * is weak.
   */
  if (
    result.action === "turn_idle"
  ) {
    return -0.06;
  }

  /*
   * Upset is useful for stress/frustration. Give it a small
   * boost so it can beat generic sad when both appear.
   */
  if (
    result.action === "turn_upset"
  ) {
    return 0.03;
  }

  return 0;
}


function sourceBias(
  source: VoiceIntentSource
): number {
  return (
    SOURCE_WEIGHTS[source] ??
    0
  );
}


function adjustedScore(
  result: VoiceCommandResult
): number {
  return (
    result.confidenceScore +
    sourceBias(result.source) +
    actionBias(result)
  );
}


function toCandidate(
  result: VoiceCommandResult
): VoiceDecisionCandidate {
  return {
    source:
      result.source,

    action:
      result.action,

    intentLabel:
      result.intentLabel,

    confidenceScore:
      result.confidenceScore,

    adjustedScore:
      adjustedScore(result),

    matchedRuleId:
      result.matchedRuleId,

    reason:
      result.confidenceLabel,
  };
}


function formatDecisionReason(
  winner: VoiceCommandResult,
  candidates: VoiceDecisionCandidate[]
): string {
  const sorted =
    [...candidates].sort(
      (left, right) =>
        right.adjustedScore -
        left.adjustedScore
    );

  const runnerUp =
    sorted[1];

  if (!runnerUp) {
    return `Selected ${winner.intentLabel} from ${winner.source} because it was the only available emotional interpretation.`;
  }

  return `Selected ${winner.intentLabel} from ${winner.source} because its adjusted score ${sorted[0].adjustedScore.toFixed(
    2
  )} beat ${runnerUp.intentLabel} from ${runnerUp.source} at ${runnerUp.adjustedScore.toFixed(
    2
  )}.`;
}


export function chooseBestEmotionCandidate(
  candidates: Array<
    VoiceCommandResult | null
  >,
  fallback: VoiceCommandResult
): VoiceCommandResult {
  const validCandidates =
    candidates.filter(
      (
        candidate
      ): candidate is VoiceCommandResult =>
        Boolean(candidate)
    );

  if (
    validCandidates.length === 0
  ) {
    const fallbackCandidate =
      toCandidate(fallback);

    return {
      ...fallback,

      decisionCandidates: [
        fallbackCandidate,
      ],

      decisionReason:
        "No emotional candidate was strong enough, so the router selected Idle as the safe neutral fallback.",
    };
  }

  const winner =
    [...validCandidates].sort(
      (left, right) =>
        adjustedScore(right) -
        adjustedScore(left)
    )[0];

  const candidateSnapshots =
    validCandidates
      .map(toCandidate)
      .sort(
        (left, right) =>
          right.adjustedScore -
          left.adjustedScore
      );

  return {
    ...winner,

    decisionCandidates:
      candidateSnapshots,

    decisionReason:
      formatDecisionReason(
        winner,
        candidateSnapshots
      ),
  };
}
