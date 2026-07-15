import { describe, expect, it } from "vitest";

import {
  buildLocalLlmPrompt,
} from "../localLlmPrompt";


describe("buildLocalLlmPrompt", () => {
  it("clearly separates robot identity from student identity", () => {
    const prompt =
      buildLocalLlmPrompt({
        robotName: "XRP Robot",
        profileFields: {
          studies: ["software engineering"],
          occupation: ["software engineer"],
          interests: ["robotics"],
        },
        memoryItems: [],
        recentMessages: [],
        studentMessage:
          "I am a software engineering",
      });

    expect(prompt).toContain("You are XRP Robot, the XRP robot");
    expect(prompt).toContain("The user is the student");
    expect(prompt).toContain("Student name: Unknown");
    expect(prompt).toContain("Studies: software engineering");
    expect(prompt).toContain("Occupation: software engineer");
    expect(prompt).toContain(
      "never repeat the student's personal statement as if it were your identity"
    );
    expect(prompt).toContain(
      "never say \"I'm...\" using a profession"
    );
    expect(prompt).toContain(
      "ask one short clarification question"
    );
  });
});
