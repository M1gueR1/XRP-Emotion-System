import { describe, expect, it } from "vitest";

import { normalizeCustomEmotionAnimationConfiguration } from "../customEmotionAnimationConfig";

describe("custom emotion animation configuration", () => {
  it("forces single images to one frame played once", () => {
    expect(
      normalizeCustomEmotionAnimationConfiguration({
        sourceMode: "single_image",
        frameCount: 12,
        repeatMode: "loop",
        repeatCount: 7,
      }),
    ).toEqual({
      sourceMode: "single_image",
      frameCount: 1,
      repeatMode: "once",
      repeatCount: 1,
    });
  });

  it("preserves horizontal spritesheet frame counts", () => {
    const result = normalizeCustomEmotionAnimationConfiguration({
      sourceMode: "horizontal_spritesheet",
      frameCount: 8,
      repeatMode: "loop",
      repeatCount: 9,
    });
    expect(result.frameCount).toBe(8);
    expect(result.repeatMode).toBe("loop");
    expect(result.repeatCount).toBe(1);
  });

  it("preserves a fixed repeat count", () => {
    const result = normalizeCustomEmotionAnimationConfiguration({
      sourceMode: "grid_spritesheet",
      frameCount: 6,
      repeatMode: "count",
      repeatCount: 4,
    });
    expect(result.repeatCount).toBe(4);
  });

  it("normalizes once to an implicit repeat count of one", () => {
    const result = normalizeCustomEmotionAnimationConfiguration({
      sourceMode: "horizontal_spritesheet",
      frameCount: 5,
      repeatMode: "once",
      repeatCount: 20,
    });
    expect(result.repeatCount).toBe(1);
  });
});

