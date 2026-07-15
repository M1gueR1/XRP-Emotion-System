import { describe, expect, it } from "vitest";

import {
  checkChildSafety,
} from "../childSafetyEngine";

import {
  defaultChildSafetyPolicy,
} from "../childSafetyPolicyStore";


describe("checkChildSafety", () => {
  const policy =
    defaultChildSafetyPolicy();

  it("allows ordinary preference statements that share generic wording with unsafe examples", () => {
    const safeTexts = [
      "I like pasta",
      "I like videogames",
      "I like video games",
      "I like fun",
      "I like soccer",
      "I like bets",
      "I love bets",
      "I learned that you like videogames.",
      "What are you doing?",
      "How are you doing?",
    ];

    for (const text of safeTexts) {
      expect(
        checkChildSafety(text, policy),
        text
      ).toMatchObject({
        allowed: true,
      });
    }
  });

  it("still blocks explicit unsafe preference statements", () => {
    const unsafeTexts = [
      "I like guns",
      "I like beer",
      "I like drugs",
      "I like blood",
      "I want to hurt someone",
    ];

    for (const text of unsafeTexts) {
      expect(
        checkChildSafety(text, policy),
        text
      ).toMatchObject({
        allowed: false,
      });
    }
  });
});
