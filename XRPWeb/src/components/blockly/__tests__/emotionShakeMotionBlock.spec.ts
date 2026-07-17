import * as Blockly from "blockly/core";
import "blockly/blocks";
import {
  pythonGenerator,
} from "blockly/python";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "../../dashboard/emotions/customEmotionStore",
  () => ({
    listCustomEmotions:
      vi.fn().mockResolvedValue([]),
  })
);

import "../xrp_blocks";
import "../xrp_blocks_python";

function createMotionDefinition(
  workspace: Blockly.Workspace
) {
  const definition =
    workspace.newBlock(
      "xrp_emotion_define_motion"
    );

  definition.setFieldValue(
    "sad",
    "EMOTION"
  );

  return definition;
}

function connectFirstMotionStep(
  definition: Blockly.Block,
  step: Blockly.Block
) {
  const containerConnection =
    definition
      .getInput("STEPS")
      ?.connection;

  if (
    !containerConnection ||
    !step.previousConnection
  ) {
    throw new Error(
      "Missing motion step connection"
    );
  }

  containerConnection.connect(
    step.previousConnection
  );
}

describe(
  "emotion shake motion Blockly block",
  () => {
    let workspace: Blockly.Workspace;

    beforeEach(() => {
      workspace =
        new Blockly.Workspace();
    });

    afterEach(() => {
      workspace.dispose();
    });

    it(
      "connects wherever emotion motion steps are allowed",
      () => {
        const block =
          workspace.newBlock(
            "xrp_emotion_shake_motion"
          );

        expect(
          block.previousConnection?.getCheck()
        ).toEqual([
          "EmotionMotionStep",
        ]);
        expect(
          block.nextConnection?.getCheck()
        ).toEqual([
          "EmotionMotionStep",
        ]);
      }
    );

    it(
      "generates one left-right drivetrain shake inside an emotion motion definition",
      () => {
        const definition =
          createMotionDefinition(
            workspace
          );

        const shake =
          workspace.newBlock(
            "xrp_emotion_shake_motion"
          );

        shake.setFieldValue(
          "70",
          "DURATION"
        );
        shake.setFieldValue(
          "0.2",
          "STRAIGHT"
        );
        shake.setFieldValue(
          "0.45",
          "TURN_STRENGTH"
        );

        connectFirstMotionStep(
          definition,
          shake
        );

        const code =
          pythonGenerator.workspaceToCode(
            workspace
          );

        expect(code).toContain(
          'emotion.configure_motion(\n    "sad",'
        );
        expect(code).toContain(
          "        (70, 0.2, 0.45),\n" +
            "        (70, 0.2, -0.45),"
        );
      }
    );
  }
);
