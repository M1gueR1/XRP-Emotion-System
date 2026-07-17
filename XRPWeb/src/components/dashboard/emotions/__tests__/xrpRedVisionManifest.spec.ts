import {
  describe,
  expect,
  it,
} from "vitest";

import {
  makeManifestEntryCommand,
} from "../xrpRedVisionUploadService";


describe("Red Vision custom emotion manifest", () => {
  it("persists the browser emotion ID with existing animation fields", () => {
    const command =
      makeManifestEntryCommand(
        "squirtle_pro",
        129,
        4,
        4,
        "loop",
        null
      );

    expect(command).toContain(
      '"emotion_id": 129'
    );
    expect(command).toContain(
      '"frame_count": 4'
    );
    expect(command).toContain(
      '"default_fps": 4'
    );
    expect(command).toContain(
      '"repeat_mode": "loop"'
    );
    expect(command).toContain(
      '"repeat_count": None'
    );
    expect(command).not.toContain("null");
  });

  it("writes numeric repeat counts as Python numbers", () => {
    const command =
      makeManifestEntryCommand(
        "shake",
        130,
        6,
        8,
        "loop",
        3
      );

    expect(command).toContain(
      '"repeat_count": 3'
    );
    expect(command).not.toContain("None");
  });
});
