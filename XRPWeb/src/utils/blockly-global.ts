// Expose Blockly globally for external plugins via import maps
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

declare global {
    interface Window {
        Blockly: typeof Blockly;
        BlocklyPython: typeof pythonGenerator;
    }
}

// Make Blockly available globally
window.Blockly = Blockly;
window.BlocklyPython = pythonGenerator;

// Also export for internal use
export { Blockly, pythonGenerator };

