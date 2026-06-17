import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

// Color LED block definition for RP2350 board
  
  const xrpColorLedBlock = {
  "type": "xrp_color_LED",
  "message0": "Color LED %1",
  "args0": [
    {
      "type": "field_colour",
      "name": "COLOR",
      "colour": "#ff4040",
      "colourOptions": [
        "#ffffff", "#000000", "#ffcccc", "#ff6666", "#ff0000", "#cc0000",
        "#ffcc99", "#ff9966", "#ff9900", "#ff6600", "#cc6600", "#993300",
        "#ffff99", "#ffff66", "#ffcc66", "#ffcc33", "#cc9933", "#996633",
        "#99ff99", "#66ff99", "#33ff33", "#00ff00", "#33cc00", "#006600",
        "#99ffff", "#33ffff", "#66cccc", "#00cccc", "#339999", "#336666",
        "#ccffff", "#66ffff", "#33ccff", "#3366ff", "#3333ff", "#0000ff",
        "#ccccff", "#9999ff", "#6666cc", "#6633ff", "#6600cc", "#333399",
        "#ffccff", "#ff99ff", "#cc66cc", "#cc33cc", "#993399", "#663366"
      ],
      "columns": 6
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 150,
  "tooltip": "",
  "helpUrl": ""
};

// 2. Register your block definition with Blockly
Blockly.common.defineBlocksWithJsonArray([xrpColorLedBlock]);


pythonGenerator.forBlock['xrp_color_LED'] = function (block) {
  pythonGenerator.definitions_['import_board'] = 'from XRPLib.board import Board';
  pythonGenerator.definitions_[`board_setup`] = `board = Board.get_default_board()`;
  var color = block.getFieldValue("COLOR");
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);   
  var code = `board.set_rgb_led(${r},${g},${b})\n`;
  return code;
};
