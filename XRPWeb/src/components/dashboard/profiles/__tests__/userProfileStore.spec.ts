import { beforeEach, describe, expect, it } from "vitest";

import {
  getActiveUserProfile,
  getUserProfiles,
  isPlausibleProfileName,
  parseProfileText,
} from "../userProfileStore";


const USER_PROFILES_STORAGE_KEY =
  "xrp-emotion-system:user-profiles:v1";

const ACTIVE_USER_PROFILE_STORAGE_KEY =
  "xrp-emotion-system:active-user-profile:v1";


describe("user profile parsing and sanitation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not store name a from an ambiguous software engineering sentence", () => {
    const parsed =
      parseProfileText(
        "I am a software engineering"
      );

    expect(parsed.displayName).toBeUndefined();
    expect(parsed.memoryItems).toHaveLength(0);
    expect(parsed.clarification).toContain("study");
  });

  it("stores occupation, not name, from a clear profession statement", () => {
    const parsed =
      parseProfileText(
        "I am a software engineer"
      );

    expect(parsed.displayName).toBeUndefined();
    expect(parsed.memoryItems).toEqual([
      expect.objectContaining({
        kind: "work",
        field: "occupation",
        value: "software engineer",
      }),
    ]);
  });

  it("stores studies, not name, from a study statement", () => {
    const parsed =
      parseProfileText(
        "I study software engineering"
      );

    expect(parsed.displayName).toBeUndefined();
    expect(parsed.memoryItems).toEqual([
      expect.objectContaining({
        kind: "study",
        field: "studies",
        value: "software engineering",
      }),
    ]);
  });

  it("does not modify the name for student, emotion, or origin statements", () => {
    expect(parseProfileText("I am a student").displayName)
      .toBeUndefined();
    expect(parseProfileText("I am happy").displayName)
      .toBeUndefined();
    expect(parseProfileText("I'm from Colombia").displayName)
      .toBeUndefined();
  });

  it("stores plausible explicit names", () => {
    expect(parseProfileText("I'm Miguel").displayName)
      .toBe("Miguel");
    expect(parseProfileText("My name is Miguel").displayName)
      .toBe("Miguel");
    expect(isPlausibleProfileName("Miguel"))
      .toBe(true);
  });

  it("removes invalid legacy names while preserving valid stored names", () => {
    window.localStorage.setItem(
      USER_PROFILES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "a",
          displayName: "a",
          facts: [
            {
              id: "fact-1",
              text: "Likes robotics",
              createdAt: "2026-01-01T00:00:00.000Z",
              source: "chat",
            },
          ],
          memoryItems: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "miguel",
          displayName: "Miguel",
          facts: [],
          memoryItems: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ])
    );

    const profiles =
      getUserProfiles();

    expect(profiles.map((profile) => profile.displayName))
      .not.toContain("a");
    expect(profiles.map((profile) => profile.displayName))
      .toContain("Unnamed profile");
    expect(profiles.map((profile) => profile.displayName))
      .toContain("Miguel");
    expect(profiles.find((profile) => profile.id === "a")?.facts)
      .toHaveLength(1);
  });

  it("does not display invalid active profile name after sanitation", () => {
    window.localStorage.setItem(
      USER_PROFILES_STORAGE_KEY,
      JSON.stringify([
        {
          id: "a",
          displayName: "a",
          facts: [],
          memoryItems: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ])
    );
    window.localStorage.setItem(
      ACTIVE_USER_PROFILE_STORAGE_KEY,
      "a"
    );

    expect(getActiveUserProfile()?.displayName)
      .toBe("Unnamed profile");
  });

  it("separates roles, activities, skills, traits, origin, and preferences", () => {
    expect(parseProfileText("I'm a soccer player").memoryItems).toEqual([
      expect.objectContaining({ kind: "role", field: "role", value: "soccer player" }),
    ]);
    expect(parseProfileText("I play soccer").memoryItems).toEqual([
      expect.objectContaining({ kind: "activity", value: "soccer" }),
    ]);
    expect(parseProfileText("I'm good at soccer").memoryItems).toEqual([
      expect.objectContaining({ kind: "skill", value: "soccer" }),
    ]);
    expect(parseProfileText("I'm organized").memoryItems).toEqual([
      expect.objectContaining({ kind: "trait", value: "organized" }),
    ]);
    expect(parseProfileText("I'm from Colombia").memoryItems).toEqual([
      expect.objectContaining({ kind: "identity", field: "origin", value: "Colombia" }),
    ]);
    expect(parseProfileText("I don't like spiders").memoryItems).toEqual([
      expect.objectContaining({ kind: "preference", polarity: "dislike", target: "spiders" }),
    ]);
  });

  it("never treats temporary states as names or stable traits", () => {
    for (const input of ["I'm tired", "I'm sad", "I'm nervous", "I'm hungry", "I'm frustrated today"]) {
      const parsed = parseProfileText(input);
      expect(parsed.displayName, input).toBeUndefined();
      expect(parsed.memoryItems.some((item) => item.kind === "trait"), input).toBe(false);
    }
  });

  it("protects a known name from later I'm descriptions", () => {
    for (const input of ["I'm studying physics", "I'm a soccer player", "I'm nervous", "I'm a software engineer"]) {
      expect(parseProfileText(input, { knownDisplayName: "Miguel", allowImplicitName: false }).displayName, input).toBeUndefined();
    }
  });

  it("rejects malformed implicit introductions", () => {
    for (const input of ["I'm a.", "I'm an.", "I'm the.", "I'm studying.", "I'm feeling.", "I'm from.", "I am called."]) {
      expect(parseProfileText(input).displayName, input).toBeUndefined();
    }
  });

  it("sanitizes every known corrupted legacy name without deleting memories", () => {
    const names = ["a", "studying", "feeling", "from", "happy", "sad", "tired"];
    window.localStorage.setItem(USER_PROFILES_STORAGE_KEY, JSON.stringify(names.map((displayName, index) => ({
      id: `legacy-${index}`,
      displayName,
      facts: [],
      memoryItems: [{
        id: `memory-${index}`, kind: "preference", target: "robotics", polarity: "like", intensity: 0.7,
        sourceText: "I like robotics", source: "chat", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
      }],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    }))));
    const profiles = getUserProfiles();
    expect(profiles.every((profile) => profile.displayName === "Unnamed profile")).toBe(true);
    expect(profiles.every((profile) => profile.memoryItems.length === 1)).toBe(true);
  });
});
