import { describe, expect, it } from "vitest";

import { buildDeleteCustomEmotionScript } from "../redVisionCustomEmotionDelete";

describe("XRP Red Vision custom emotion deletion", () => {
  it("removes the PNG, temporary PNG, and manifest entry", () => {
    const script = buildDeleteCustomEmotionScript("happy_robot");

    expect(script).toContain(
      "/emotion_sheets_custom/happy_robot.png",
    );
    expect(script).toContain("os.remove(image_path)");
    expect(script).toContain("os.remove(image_path + '.tmp')");
    expect(script).toContain("del manifest[emotion_name]");
    expect(script).toContain("DELETE_OK happy_robot");
    expect(script).not.toContain("EmotionLib");
    expect(script).not.toContain("rv_init");
  });

  it("rejects unsafe filesystem names", () => {
    expect(() =>
      buildDeleteCustomEmotionScript("../main"),
    ).toThrow("Invalid custom emotion name");
  });
});
