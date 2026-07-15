import { describe, expect, it } from "vitest";
import { checkChildSafety } from "../../safety/childSafetyEngine";
import {
  extractContextualNameCandidate,
  identityStateForProfile,
  isAffirmativeNameConfirmation,
  isNegativeNameConfirmation,
  nameConfirmationPrompt,
  onboardingGreeting,
} from "../studentIdentityState";
import { detectStudentIntent, separateSafetyFromUnderstanding } from "../studentIntentEngine";
import { CompanionResponseBank } from "../responseBank";

describe("reliable student companion conversation", () => {
  it("keeps everyday conversation safe and distinct from unsupported intent", () => {
    for (const input of ["Hello", "How are you?", "What are you doing?", "My name is Miguel.", "I like dogs.", "I'm studying physics.", "I'm a soccer player.", "I'm from Colombia.", "I'm sad.", "I'm nervous about my test.", "My dog got lost.", "I failed my exam.", "My friend moved away.", "I won a competition.", "Can I tell you about my day?", "What do you remember about me?"]) {
      const safety = checkChildSafety(input);
      expect(safety.allowed, input).toBe(true);
      expect(separateSafetyFromUnderstanding(safety.allowed, detectStudentIntent(input)).safetyStatus).toBe("safe");
    }
  });

  it("classifies wellbeing, loss, and celebration without Qwen", () => {
    expect(detectStudentIntent("How are you?")).toMatchObject({ intent: "wellbeing_question", responseCategory: "wellbeing" });
    expect(detectStudentIntent("My dog got lost.")).toMatchObject({ intent: "emotional_disclosure", studentEmotion: "sad", responseCategory: "empathetic_sad" });
    expect(detectStudentIntent("I won a competition.")).toMatchObject({ studentEmotion: "excited", responseCategory: "celebratory" });
  });

  it("accepts a short name only while awaiting a name", () => {
    expect(extractContextualNameCandidate("Miguel", "awaiting_name").candidate).toBe("Miguel");
    expect(extractContextualNameCandidate("Miguel", "known_student", "Daniel").candidate).toBeUndefined();
    expect(extractContextualNameCandidate("I'm studying physics", "awaiting_name").candidate).toBeUndefined();
  });

  it("protects a known name with an explicit confirmation step", () => {
    expect(extractContextualNameCandidate("I'm a soccer player", "known_student", "Miguel").candidate).toBeUndefined();
    expect(extractContextualNameCandidate("My name is Daniel", "known_student", "Miguel")).toMatchObject({ candidate: "Daniel", requiresConfirmation: true });
  });

  it("asks for confirmation before saving a new student name", () => {
    expect(extractContextualNameCandidate("My name is Miguel", "awaiting_name")).toMatchObject({ candidate: "Miguel", requiresConfirmation: true });
    expect(extractContextualNameCandidate("Hi, I'm Miguel and I like soccer", "awaiting_name")).toMatchObject({ candidate: "Miguel", requiresConfirmation: true });
    expect(extractContextualNameCandidate("Miguel", "awaiting_name")).toMatchObject({ candidate: "Miguel" });
  });

  it("produces varied onboarding and confirmation prompts", () => {
    expect(onboardingGreeting("XRP Robot", () => 0)).toBe("Hi! I'm XRP Robot. What's your name?");
    expect(onboardingGreeting("XRP Robot", () => 0.999)).toBe("Hey! XRP Robot checking in. What's your name?");
    expect(nameConfirmationPrompt("Miguel", () => 0)).toBe("So, should I call you Miguel?");
    expect(nameConfirmationPrompt("Miguel", () => 0.999)).toBe("So that's Miguel, then?");
    expect(identityStateForProfile(null)).toBe("unknown_student");
  });

  it("recognizes common yes and no answers for name confirmation", () => {
    expect(isAffirmativeNameConfirmation("yes")).toBe(true);
    expect(isAffirmativeNameConfirmation("that's right")).toBe(true);
    expect(isAffirmativeNameConfirmation("si")).toBe(true);
    expect(isNegativeNameConfirmation("no")).toBe(true);
    expect(isNegativeNameConfirmation("wrong name")).toBe(true);
    expect(isNegativeNameConfirmation("try again")).toBe(true);
  });

  it("does not immediately repeat response-bank variants", () => {
    const bank = new CompanionResponseBank();
    const first = bank.select("wellbeing");
    const second = bank.select("wellbeing");
    expect(second).not.toBe(first);
  });
});
