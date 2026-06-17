import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

// Advanced Distance Sensor block
Blockly.Blocks['xrp_advanced_distance'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Advanced Distance Sensor")
      .appendField(new Blockly.FieldDropdown([["Front", "FRONT"], ["Back", "BACK"], ["Left", "LEFT"], ["Right", "RIGHT"]]), "SENSOR");
    this.setOutput(true, "Number");
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Get distance reading from advanced sensor");
    this.setHelpUrl("");
  }
};

// Temperature Sensor block
Blockly.Blocks['xrp_temperature_sensor'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Temperature Sensor");
    this.setOutput(true, "Number");
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Get temperature reading from sensor");
    this.setHelpUrl("");
  }
};

// Python generators
pythonGenerator.forBlock['xrp_advanced_distance'] = function(block) {
  const sensor = block.getFieldValue('SENSOR');
  const code = `xrp.advanced_distance_sensor("${sensor}")`;
  return [code, pythonGenerator.ORDER_NONE];
};

pythonGenerator.forBlock['xrp_temperature_sensor'] = function(block) {
  const code = `xrp.temperature_sensor()`;
  return [code, pythonGenerator.ORDER_NONE];
};
