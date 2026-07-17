// @vitest-environment jsdom

import * as Blockly from "blockly/core";
import { pythonGenerator } from "blockly/python";

import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import "../xrp_blocks";
import "../xrp_blocks_python";

import {
  deleteCustomEmotionKeywordRule,
  toggleCustomEmotionKeywordRule,
  upsertCustomEmotionKeywordRule,
} from "../../dashboard/keywords/customEmotionKeywordStore";

import {
  getOfficialVoiceKeywordEmotionTargets,
} from "../../dashboard/keywords/customVoiceKeywordEmotionCatalog";

import {
  OFFICIAL_VOICE_COMMAND_OPTIONS,
} from "../customVoiceCommandCatalogBridge";


describe("dynamic Blockly voice command catalog", () => {
  let workspace: Blockly.Workspace;

  beforeEach(() => {
    window.localStorage.clear();
    workspace = new Blockly.Workspace();
  });

  it("keeps official values and Python comparisons unchanged", () => {
    const block = workspace.newBlock(
      "xrp_voice_command_is"
    );

    const field = block.getField(
      "COMMAND"
    ) as Blockly.FieldDropdown;

    expect(
      field.getOptions(false).slice(
        0,
        OFFICIAL_VOICE_COMMAND_OPTIONS.length
      )
    ).toEqual(
      OFFICIAL_VOICE_COMMAND_OPTIONS
    );

    block.setFieldValue(
      "turn_happy",
      "COMMAND"
    );

    const [code] = (
      pythonGenerator.forBlock[
        "xrp_voice_command_is"
      ](
        block,
        pythonGenerator
      ) as [string, number]
    );

    expect(code).toBe(
      'voiceCommand == "turn_happy"'
    );

    const workspaceCode =
      pythonGenerator.workspaceToCode(
        workspace
      );

    expect(workspaceCode).not.toContain(
      "RedVisionEmotionDisplay"
    );
  });

  it("adds, relabels, and preserves a stable custom command", () => {
    const happy =
      getOfficialVoiceKeywordEmotionTargets()
        .find(
          (target) =>
            target.uniqueName === "happy"
        )!;

    const created =
      upsertCustomEmotionKeywordRule({
        phrase: "celebrate with me",
        targetEmotion: happy,
      });

    const block = workspace.newBlock(
      "xrp_voice_command_is"
    );
    const field = block.getField(
      "COMMAND"
    ) as Blockly.FieldDropdown;

    block.setFieldValue(
      created.commandKey,
      "COMMAND"
    );

    expect(field.getOptions(false)).toContainEqual([
      "celebrate with me → Happy ★",
      created.commandKey,
    ]);

    upsertCustomEmotionKeywordRule({
      id: created.id,
      phrase: "party with me",
      targetEmotion: happy,
    });

    expect(field.getValue()).toBe(
      created.commandKey
    );
    expect(field.getOptions(false)).toContainEqual([
      "party with me → Happy ★",
      created.commandKey,
    ]);

    const [code] = (
      pythonGenerator.forBlock[
        "xrp_voice_command_is"
      ](
        block,
        pythonGenerator
      ) as [string, number]
    );

    expect(code).toBe(
      `voiceCommand == "${created.commandKey}"`
    );

    const workspaceCode =
      pythonGenerator.workspaceToCode(
        workspace
      );

    expect(workspaceCode).toContain(
      "RedVisionEmotionDisplay"
    );
    expect(workspaceCode).toContain(
      "emotion = Emotion("
    );

    toggleCustomEmotionKeywordRule(
      created.id
    );

    expect(field.getValue()).toBe(
      created.commandKey
    );
    expect(field.getOptions(false)).toContainEqual([
      `Missing custom voice command #${created.commandId}`,
      created.commandKey,
    ]);

    toggleCustomEmotionKeywordRule(
      created.id
    );

    deleteCustomEmotionKeywordRule(
      created.id
    );

    expect(field.getValue()).toBe(
      created.commandKey
    );
    expect(field.getOptions(false)).toContainEqual([
      `Missing custom voice command #${created.commandId}`,
      created.commandKey,
    ]);
  });
});
