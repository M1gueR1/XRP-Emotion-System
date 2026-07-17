// @vitest-environment jsdom

import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  serializeDynamicCustomVoiceCommand,
} from "../customVoiceCommandProtocol";

import {
  serializeVoiceRuntimeCommand,
} from "../voiceCommandRobotService";

import {
  createCustomVoiceKeywordResult,
} from "../useVoiceCommands";

import {
  upsertCustomEmotionKeywordRule,
} from "../../keywords/customEmotionKeywordStore";

import {
  getOfficialVoiceKeywordEmotionTargets,
} from "../../keywords/customVoiceKeywordEmotionCatalog";


describe("voice command transports", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    ["turn_happy", "V:H\n"],
    ["turn_sad", "V:S\n"],
    ["turn_excited", "V:E\n"],
    ["turn_in_love", "V:I\n"],
    ["turn_right", "V:R\n"],
    ["turn_left", "V:L\n"],
    ["turn_back", "V:B\n"],
    ["stop", "V:X\n"],
    ["showtime", "V:D\n"],
    ["go_to_sleep", "V:Z\n"],
    ["lets_play", "V:P\n"],
  ] as const)(
    "preserves the legacy payload for %s",
    (action, payload) => {
      expect(
        serializeVoiceRuntimeCommand(action)
      ).toBe(payload);

      expect(payload).not.toContain("V2:C:");
    }
  );

  it("does not serialize dashboard-only actions as runtime packets", () => {
    expect(
      serializeVoiceRuntimeCommand(
        "turn_idle"
      )
    ).toBeNull();

    expect(
      serializeVoiceRuntimeCommand(
        "turn_upset"
      )
    ).toBeNull();

    expect(
      serializeVoiceRuntimeCommand("unknown")
    ).toBeNull();
  });

  it("serializes one compact V2 custom command packet", () => {
    expect(
      serializeDynamicCustomVoiceCommand({
        commandId: 1001,
        emotionId: 129,
      })
    ).toBe("V2:C:1001:129\n");
  });

  it("keeps a custom phrase targeting Happy distinct from turn_happy", () => {
    const happy =
      getOfficialVoiceKeywordEmotionTargets()
        .find(
          (target) =>
            target.uniqueName === "happy"
        )!;

    const rule =
      upsertCustomEmotionKeywordRule({
        phrase: "celebrate with me",
        targetEmotion: happy,
      });

    const result =
      createCustomVoiceKeywordResult(
        "celebrate with me",
        {
          rule,
          matchedText: rule.phrase,
        }
      );

    expect(result.action).toBe(
      rule.commandKey
    );
    expect(result.action).not.toBe(
      "turn_happy"
    );
    expect(result.customCommand?.targetEmotionId)
      .toBe(1);
    expect(
      serializeVoiceRuntimeCommand(
        result.action
      )
    ).toBeNull();
  });

  it("rejects invalid custom command and emotion IDs", () => {
    expect(() =>
      serializeDynamicCustomVoiceCommand({
        commandId: 999,
        emotionId: 129,
      })
    ).toThrow(/commandId/);

    expect(() =>
      serializeDynamicCustomVoiceCommand({
        commandId: 1001,
        emotionId: 256,
      })
    ).toThrow(/Emotion ID/);
  });
});
