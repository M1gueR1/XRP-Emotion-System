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


function createComposableDefinition(
  workspace: Blockly.Workspace,
  emotionName = "sad"
) {
  const definition =
    workspace.newBlock(
      "xrp_emotion_define_composable"
    );

  definition.setFieldValue(
    emotionName,
    "EMOTION"
  );

  return definition;
}


function connectFirstProperty(
  definition: Blockly.Block,
  property: Blockly.Block
) {
  const containerConnection =
    definition
      .getInput("PROPERTIES")
      ?.connection;

  if (
    !containerConnection ||
    !property.previousConnection
  ) {
    throw new Error(
      "Missing emotion property connection"
    );
  }

  containerConnection.connect(
    property.previousConnection
  );
}


function connectNextProperty(
  firstProperty: Blockly.Block,
  nextProperty: Blockly.Block
) {
  if (
    !firstProperty.nextConnection ||
    !nextProperty.previousConnection
  ) {
    throw new Error(
      "Missing chained emotion property connection"
    );
  }

  firstProperty.nextConnection.connect(
    nextProperty.previousConnection
  );
}


describe(
  "composable emotion Blockly blocks",
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
      "uses inherited animation defaults and dashboard plus drivetrain permissions when empty",
      () => {
        createComposableDefinition(
          workspace
        );

        const code =
          pythonGenerator.workspaceToCode(
            workspace
          );

        expect(code).toContain(
          'name="sad"'
        );
        expect(code).toContain(
          "playback_fps=None"
        );
        expect(code).toContain(
          "frame_subset=None"
        );
        expect(code).toContain(
          "min_time_before_switch_ms=None"
        );
        expect(code).toContain(
          "repeat_mode=None"
        );
        expect(code).toContain(
          "repeat_count=None"
        );
        expect(code).toContain(
          'flag_overrides=("dashboard_screen", "drivetrain")'
        );
        expect(code).not.toContain(
          "redVisionEmotionDisplay.preload("
        );
      }
    );

    it(
      "overrides only animation speed when that is the only property block",
      () => {
        const definition =
          createComposableDefinition(
            workspace
          );

        const speed =
          workspace.newBlock(
            "xrp_emotion_property_animation_speed"
          );

        speed.setFieldValue(
          8,
          "FPS"
        );

        connectFirstProperty(
          definition,
          speed
        );

        const code =
          pythonGenerator.workspaceToCode(
            workspace
          );

        expect(code).toContain(
          "playback_fps=8"
        );
        expect(code).toContain(
          "frame_subset=None"
        );
        expect(code).toContain(
          "min_time_before_switch_ms=None"
        );
        expect(code).toContain(
          "repeat_mode=None"
        );
      }
    );

    it(
      "reads repeat and Red Vision preload from chained property blocks",
      () => {
        const definition =
          createComposableDefinition(
            workspace
          );

        const repeat =
          workspace.newBlock(
            "xrp_emotion_property_animation_repeat"
          );

        repeat.setFieldValue(
          "count",
          "REPEAT_MODE"
        );
        repeat.setFieldValue(
          5,
          "REPEAT_COUNT"
        );

        const preload =
          workspace.newBlock(
            "xrp_emotion_property_preload_red_vision"
          );

        preload.setFieldValue(
          "TRUE",
          "PRELOAD_RED_VISION"
        );

        connectFirstProperty(
          definition,
          repeat
        );

        connectNextProperty(
          repeat,
          preload
        );

        const code =
          pythonGenerator.workspaceToCode(
            workspace
          );

        expect(code).toContain(
          'repeat_mode="count"'
        );
        expect(code).toContain(
          "repeat_count=5"
        );
        expect(code).toContain(
          "redVisionEmotionDisplay.preload("
        );
        expect(code).toContain(
          '("sad",)'
        );
      }
    );

    it(
      "uses a dedicated connection type for the container and every property block",
      () => {
        const definition =
          createComposableDefinition(
            workspace
          );

        const propertyTypes = [
          "xrp_emotion_property_animation_speed",
          "xrp_emotion_property_minimum_switch_time",
          "xrp_emotion_property_animation_frames",
          "xrp_emotion_property_animation_repeat",
          "xrp_emotion_property_preload_red_vision",
          "xrp_emotion_property_control_permissions",
        ];

        expect(
          definition
            .getInput("PROPERTIES")
            ?.connection
            ?.getCheck()
        ).toEqual([
          "EmotionDefinitionProperty",
        ]);

        for (const propertyType of propertyTypes) {
          const property =
            workspace.newBlock(
              propertyType
            );

          expect(
            property.previousConnection
              ?.getCheck()
          ).toEqual([
            "EmotionDefinitionProperty",
          ]);

          expect(
            property.nextConnection
              ?.getCheck()
          ).toEqual([
            "EmotionDefinitionProperty",
          ]);
        }
      }
    );

    it(
      "automatically rejects a regular statement block from the settings container",
      () => {
        const definition =
          createComposableDefinition(
            workspace
          );

        const unrelatedBlock =
          workspace.newBlock(
            "controls_if"
          );

        connectFirstProperty(
          definition,
          unrelatedBlock
        );

        definition.onchange?.(
          {
            type:
              Blockly.Events.BLOCK_MOVE,
          } as Blockly.Events.Abstract
        );

        expect(
          unrelatedBlock.getParent()
        ).toBe(null);
      }
    );
  }
);
