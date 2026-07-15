import { describe, expect, it } from "vitest";

import {
  applyGeneratedReplySafety,
  hasProtectedExactAnswer,
  shouldAttemptGemini,
  shouldAttemptLocalLlm,
  type LocalLlmRoutingContext,
} from "../localLlmRouting";


function routingContext(
  overrides: Partial<LocalLlmRoutingContext> = {}
): LocalLlmRoutingContext {
  return {
    mode: "smart_fallback",
    inputAllowed: true,
    hasExactCustomAnswer: false,
    hasMemoryAnswer: false,
    isSmallTalk: false,
    isFacialGreeting: false,
    isMovementCommand: false,
    hasStrongSocialAnswer: false,
    hasStrongEmpathyAnswer: false,
    localReplyIsWeak: true,
    localLlmEnabled: true,
    localLlmReady: true,
    ...overrides,
  };
}


describe("browser-local model routing", () => {
  it("allows a weak local answer to use the browser-local model", () => {
    expect(shouldAttemptLocalLlm(routingContext())).toBe(true);
  });

  it("keeps only-local-keywords mode on the classic local layers", () => {
    expect(shouldAttemptLocalLlm(routingContext({
      mode: "local_keywords_only",
    }))).toBe(false);

    expect(shouldAttemptGemini({
      mode: "local_keywords_only",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("uses the downloaded local model directly in downloaded-model-only mode", () => {
    expect(shouldAttemptLocalLlm(routingContext({
      mode: "local_downloaded_model_only",
      hasExactCustomAnswer: true,
      hasStrongEmpathyAnswer: true,
      localReplyIsWeak: false,
    }))).toBe(true);

    expect(shouldAttemptGemini({
      mode: "local_downloaded_model_only",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("keeps hybrid local away from Gemini while allowing weak replies to use the browser-local model", () => {
    expect(shouldAttemptLocalLlm(routingContext({
      mode: "hybrid_local",
      localReplyIsWeak: true,
    }))).toBe(true);

    expect(shouldAttemptGemini({
      mode: "hybrid_local",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("prevents local LLM and Gemini for an exact custom answer", () => {
    const context = routingContext({ hasExactCustomAnswer: true });
    expect(shouldAttemptLocalLlm(context)).toBe(false);
    expect(shouldAttemptGemini({
      mode: "smart_fallback",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: hasProtectedExactAnswer(context),
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("prevents local LLM and Gemini for a direct memory answer", () => {
    const context = routingContext({ hasMemoryAnswer: true });
    expect(shouldAttemptLocalLlm(context)).toBe(false);
    expect(shouldAttemptGemini({
      mode: "smart_fallback",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: hasProtectedExactAnswer(context),
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("preserves a strong empathy answer", () => {
    expect(shouldAttemptLocalLlm(routingContext({
      hasStrongEmpathyAnswer: true,
    }))).toBe(false);

    expect(shouldAttemptGemini({
      mode: "smart_fallback",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: true,
      finalLocalReplyIsWeak: false,
    })).toBe(false);
  });

  it("never permits Gemini in local-only modes", () => {
    expect(shouldAttemptGemini({
      mode: "local_keywords_only",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("allows Gemini after local failure only in Gemini modes", () => {
    const base = {
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    };

    expect(shouldAttemptGemini({ mode: "smart_fallback", ...base })).toBe(true);
    expect(shouldAttemptGemini({ mode: "rescue_with_gemini", ...base })).toBe(true);
    expect(shouldAttemptGemini({ mode: "local_keywords_only", ...base })).toBe(false);
    expect(shouldAttemptGemini({ mode: "local_downloaded_model_only", ...base })).toBe(false);
  });

  it("uses Gemini for every safe response in full-Gemini mode", () => {
    expect(shouldAttemptGemini({
      mode: "rescue_with_gemini",
      inputAllowed: true,
      hasApiKey: true,
      hasProtectedExactAnswer: true,
      hasStrongLocalAnswer: true,
      finalLocalReplyIsWeak: false,
    })).toBe(true);
  });

  it("blocks every model when input safety fails", () => {
    expect(shouldAttemptLocalLlm(routingContext({ inputAllowed: false }))).toBe(false);
    expect(shouldAttemptGemini({
      mode: "smart_fallback",
      inputAllowed: false,
      hasApiKey: true,
      hasProtectedExactAnswer: false,
      hasStrongLocalAnswer: false,
      finalLocalReplyIsWeak: true,
    })).toBe(false);
  });

  it("replaces an unsafe generated output with the configured safe reply", () => {
    expect(applyGeneratedReplySafety(
      "unsafe generated content",
      "Let us choose a safe classroom topic.",
      false
    )).toEqual({
      reply: "Let us choose a safe classroom topic.",
      blocked: true,
    });
  });
});
