import { describe, expect, it } from "vitest";
import { buildLocalSemanticMessages, parseLocalSemanticOutput } from "../localLlmSemantic";
import { validateCandidateProfileFact } from "../../profiles/profileFactValidator";

describe("Qwen structured semantic analysis", () => {
  it("validates supported fields and rejects an invalid proposed name", () => {
    const result = parseLocalSemanticOutput(JSON.stringify({
      intent: "profile_statement",
      studentEmotion: "neutral",
      emotionConfidence: 0.6,
      candidateProfileFacts: [
        { field: "name", value: "studying", confidence: 0.9, evidence: "explicit" },
        { field: "studies", value: "physics", confidence: 0.9, evidence: "explicit" },
      ],
      needsClarification: false,
      responseCategory: "profile_acknowledgement",
      robotEmotion: "happy",
      confidence: 0.8,
    }));
    expect(result.candidateProfileFacts).toEqual([
      expect.objectContaining({ field: "studies", value: "physics" }),
    ]);
  });

  it("uses labeled profile fields and ends with the current message", () => {
    const messages = buildLocalSemanticMessages({
      profileFields: { studentName: "Miguel", studies: ["physics"], roles: ["soccer player"], origin: ["Colombia"], likes: ["dogs"] },
      recentMessages: [{ role: "user", text: "Hello" }],
      studentMessage: "My day did not go the way I expected.",
    });
    expect(messages[0].content).toContain("Student name: Miguel");
    expect(messages[0].content).toContain("Roles: soccer player");
    expect(messages.at(-1)).toEqual({ role: "user", content: "My day did not go the way I expected." });
  });

  it("does not allow inferred model facts to pass the memory gate", () => {
    expect(validateCandidateProfileFact({
      field: "occupation",
      value: "engineer",
      confidence: 0.99,
      evidence: "inferred",
    }).accepted).toBe(false);
  });
});
