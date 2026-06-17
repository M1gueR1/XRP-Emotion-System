import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

// Custom Motor Control block
Blockly.Blocks['xrp_custom_motor_control'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Custom Motor Control")
      .appendField(new Blockly.FieldDropdown([["Motor 1", "1"], ["Motor 2", "2"], ["Motor 3", "3"], ["Motor 4", "4"]]), "MOTOR");
    this.appendValueInput("SPEED")
      .setCheck("Number")
      .appendField("Speed:");
    this.appendValueInput("DIRECTION")
      .setCheck("Number")
      .appendField("Direction:");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Custom motor control with speed and direction");
    this.setHelpUrl("");
  }
};

// Python generator
pythonGenerator.forBlock['xrp_custom_motor_control'] = function(block) {
  const motor = block.getFieldValue('MOTOR');
  const speed = pythonGenerator.valueToCode(block, 'SPEED', pythonGenerator.ORDER_NONE) || '0';
  const direction = pythonGenerator.valueToCode(block, 'DIRECTION', pythonGenerator.ORDER_NONE) || '0';
  
  const code = `xrp.custom_motor_control(${motor}, ${speed}, ${direction})\n`;
  return code;
};
