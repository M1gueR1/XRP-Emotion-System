export type AiResponseMode =
  | "local_keywords_only"
  | "local_downloaded_model_only"
  | "hybrid_local"
  | "smart_fallback"
  | "rescue_with_gemini";


export type LocalLlmRoutingContext = {
  mode: AiResponseMode;
  inputAllowed: boolean;
  hasExactCustomAnswer: boolean;
  hasMemoryAnswer: boolean;
  isSmallTalk: boolean;
  isFacialGreeting: boolean;
  isMovementCommand: boolean;
  hasStrongSocialAnswer: boolean;
  hasStrongEmpathyAnswer: boolean;
  localReplyIsWeak: boolean;
  localLlmEnabled: boolean;
  localLlmReady: boolean;
};


export function hasProtectedExactAnswer(
  context: Pick<
    LocalLlmRoutingContext,
    | "hasExactCustomAnswer"
    | "hasMemoryAnswer"
    | "isSmallTalk"
    | "isFacialGreeting"
    | "isMovementCommand"
  >
): boolean {
  return (
    context.hasExactCustomAnswer ||
    context.hasMemoryAnswer ||
    context.isSmallTalk ||
    context.isFacialGreeting ||
    context.isMovementCommand
  );
}


export function shouldAttemptLocalLlm(
  context: LocalLlmRoutingContext
): boolean {
  if (
    context.mode === "local_keywords_only" ||
    context.mode === "rescue_with_gemini"
  ) {
    return false;
  }

  if (
    context.mode ===
      "local_downloaded_model_only"
  ) {
    return (
      context.inputAllowed &&
      context.localLlmEnabled &&
      context.localLlmReady
    );
  }

  return (
    context.inputAllowed &&
    context.localLlmEnabled &&
    context.localLlmReady &&
    !hasProtectedExactAnswer(context) &&
    !context.hasStrongSocialAnswer &&
    !context.hasStrongEmpathyAnswer &&
    context.localReplyIsWeak
  );
}


export type GeminiRoutingContext = {
  mode: AiResponseMode;
  inputAllowed: boolean;
  hasApiKey: boolean;
  hasProtectedExactAnswer: boolean;
  hasStrongLocalAnswer: boolean;
  finalLocalReplyIsWeak: boolean;
};


export function shouldAttemptGemini(
  context: GeminiRoutingContext
): boolean {
  if (
    context.mode === "local_keywords_only" ||
    context.mode === "hybrid_local" ||
    context.mode ===
      "local_downloaded_model_only"
  ) {
    return false;
  }

  if (context.mode === "rescue_with_gemini") {
    return context.inputAllowed && context.hasApiKey;
  }

  return (
    context.inputAllowed &&
    context.hasApiKey &&
    !context.hasProtectedExactAnswer &&
    !context.hasStrongLocalAnswer &&
    context.finalLocalReplyIsWeak
  );
}


export function applyGeneratedReplySafety(
  generatedReply: string,
  configuredSafeReply: string,
  isAllowed: boolean
): { reply: string; blocked: boolean } {
  return isAllowed
    ? { reply: generatedReply, blocked: false }
    : { reply: configuredSafeReply, blocked: true };
}
