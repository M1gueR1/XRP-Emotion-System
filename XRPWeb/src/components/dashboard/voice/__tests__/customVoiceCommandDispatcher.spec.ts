import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  dispatchCustomVoiceCommand,
} from "../customVoiceCommandDispatcher";


const command = {
  commandId: 1001,
  commandKey: "custom:1001" as const,
  phrase: "water attack",
  automaticallyPlayEmotion: true,
  targetEmotionId: 129,
  targetEmotionUniqueName: "squirtle_pro",
  targetEmotionDisplayName: "Squirtle Pro",
  targetEmotionSource: "custom" as const,
  targetMissing: false,
};


describe("custom voice command dispatcher", () => {
  it("dispatches one immediate preview and exactly one XRP packet", async () => {
    const previewEmotion = vi.fn();
    const sendCommand = vi.fn(
      async () => undefined
    );

    await dispatchCustomVoiceCommand(
      command,
      {
        previewEmotion,
        sendCommand,
      }
    );

    expect(previewEmotion).toHaveBeenCalledTimes(1);
    expect(previewEmotion).toHaveBeenCalledWith(129);
    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand).toHaveBeenCalledWith({
      commandId: 1001,
      emotionId: 129,
    });
  });

  it("does not preview or send when the target emotion is missing", async () => {
    const previewEmotion = vi.fn();
    const sendCommand = vi.fn(
      async () => undefined
    );

    await expect(
      dispatchCustomVoiceCommand(
        {
          ...command,
          targetMissing: true,
        },
        {
          previewEmotion,
          sendCommand,
        }
      )
    ).rejects.toThrow(/missing emotion/i);

    expect(previewEmotion).not.toHaveBeenCalled();
    expect(sendCommand).not.toHaveBeenCalled();
  });
});
