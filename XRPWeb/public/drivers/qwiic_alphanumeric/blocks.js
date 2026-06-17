import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

// Sparkfun alphanumeric blocks


// SF Alphanumeric Write block
Blockly.Blocks['sf_alphanumeric_write'] = {
  init: function () {
    this.appendValueInput("TEXT")
      .setCheck("String")
      .appendField("Write Display");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Write up to 4 characters to the Sparkfun Alphanumeric display");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['sf_alphanumeric_clear'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("Clear Display");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Clear the Sparkfun Alphanumeric display");
    this.setHelpUrl("");
  }
};

// Python generators
pythonGenerator.forBlock['sf_alphanumeric_write'] = function(block) {
  pythonGenerator.definitions_['import_sf_alphanumeric'] = 'import qwiic_alphanumeric';
  pythonGenerator.definitions_[`sf_alphanumeric_setup`] = `sf_alphanumeric_display = qwiic_alphanumeric.QwiicAlphanumeric()\nsf_alphanumeric_display.begin()\n`;
  const text = pythonGenerator.valueToCode(block, 'TEXT', pythonGenerator.ORDER_NONE) || '""';
  const code = `sf_alphanumeric_display.print(${text})\n`;
  return code;
};

pythonGenerator.forBlock['sf_alphanumeric_clear'] = function(block) {
  pythonGenerator.definitions_['import_sf_alphanumeric'] = 'import qwiic_alphanumeric';
  pythonGenerator.definitions_[`sf_alphanumeric_setup`] = `sf_alphanumeric_display = qwiic_alphanumeric.QwiicAlphanumeric()\nsf_alphanumeric_display.begin()\n`;
  const code = `sf_alphanumeric_display.clear()\n`;
  return code;
};


