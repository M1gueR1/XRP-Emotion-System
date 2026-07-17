// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  getCustomEmotionKeywordRules,
  reconcileCustomEmotionKeywordTargets,
  upsertCustomEmotionKeywordRule,
} from "../customEmotionKeywordStore";

import {
  getOfficialVoiceKeywordEmotionTargets,
  type VoiceKeywordEmotionTarget,
} from "../customVoiceKeywordEmotionCatalog";


const STORAGE_KEY =
  "xrp-emotion-system:custom-emotion-keywords:v1";


describe("custom voice keyword store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("assigns a stable command identity when a rule is created and edited", () => {
    const happy =
      getOfficialVoiceKeywordEmotionTargets()
        .find(
          (target) =>
            target.uniqueName === "happy"
        )!;

    const created =
      upsertCustomEmotionKeywordRule({
        phrase: "water attack",
        targetEmotion: happy,
      });

    const edited =
      upsertCustomEmotionKeywordRule({
        id: created.id,
        phrase: "use water power",
        targetEmotion: happy,
      });

    expect(created.commandId).toBeGreaterThanOrEqual(
      1000
    );
    expect(edited.commandId).toBe(
      created.commandId
    );
    expect(edited.commandKey).toBe(
      created.commandKey
    );
    expect(edited.normalizedPhrase).toBe(
      "use water power"
    );
  });

  it("migrates legacy rules once while preserving phrase and emotion", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: "legacy-rule",
          phrase: "celebrate with me",
          emotionKey: "happy",
          emotionId: 1,
          priority: 80,
          enabled: true,
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ])
    );

    const firstRead =
      getCustomEmotionKeywordRules()[0]!;
    const secondRead =
      getCustomEmotionKeywordRules()[0]!;

    expect(firstRead.phrase).toBe(
      "celebrate with me"
    );
    expect(firstRead.targetEmotionId).toBe(1);
    expect(firstRead.targetEmotionUniqueName).toBe(
      "happy"
    );
    expect(firstRead.commandKey).toMatch(
      /^custom:\d+$/
    );
    expect(secondRead.commandId).toBe(
      firstRead.commandId
    );
  });

  it("repairs duplicate command IDs deterministically", () => {
    const baseRule = {
      schemaVersion: 2,
      commandId: 1005,
      commandKey: "custom:1005",
      normalizedPhrase: "one",
      targetEmotionId: 1,
      targetEmotionUniqueName: "happy",
      targetEmotionDisplayName: "Happy",
      targetEmotionSource: "official",
      targetMissing: false,
      automaticallyPlayEmotion: true,
      exposeInBlockly: true,
      emotionKey: "happy",
      emotionId: 1,
      priority: 80,
      enabled: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          ...baseRule,
          id: "one",
          phrase: "one",
        },
        {
          ...baseRule,
          id: "two",
          phrase: "two",
          normalizedPhrase: "two",
        },
      ])
    );

    const firstRead =
      getCustomEmotionKeywordRules();
    const secondRead =
      getCustomEmotionKeywordRules();

    expect(
      new Set(
        firstRead.map(
          (rule) => rule.commandId
        )
      ).size
    ).toBe(2);
    expect(
      secondRead.map(
        (rule) => rule.commandId
      )
    ).toEqual(
      firstRead.map(
        (rule) => rule.commandId
      )
    );
  });

  it("supports official and custom targets and preserves a deleted target as missing", () => {
    const customTarget:
      VoiceKeywordEmotionTarget = {
      emotionId: 129,
      uniqueName: "squirtle_pro",
      displayName: "Squirtle Pro",
      source: "custom",
    };

    const created =
      upsertCustomEmotionKeywordRule({
        phrase: "water attack",
        targetEmotion: customTarget,
      });

    reconcileCustomEmotionKeywordTargets(
      getOfficialVoiceKeywordEmotionTargets()
    );

    const missing =
      getCustomEmotionKeywordRules()
        .find(
          (rule) => rule.id === created.id
        )!;

    expect(missing.targetEmotionId).toBe(129);
    expect(missing.targetEmotionDisplayName).toBe(
      "Squirtle Pro"
    );
    expect(missing.targetMissing).toBe(true);
    expect(missing.commandKey).toBe(
      created.commandKey
    );
  });
});
