# XRP Plugin System

The XRP Plugin System allows you to extend the Blockly interface with custom blocks and functionality. This system supports both automatic detection of plugins and special board-specific features.

## Overview

The plugin system consists of:
1. **Plugin Manager** (`src/managers/pluginmgr.ts`) - Manages plugin loading and integration
2. **Plugin Configuration** (`plugin.json`) - Defines available plugins
3. **Plugin Scripts** - JavaScript files containing Blockly block definitions and Python generators

## Plugin Configuration

Plugins are configured via a `plugin.json` file located in the `lib` directory on the XRP device. The file structure is:

```json
{
  "plugins": [
    {
      "friendly_name": "Plugin Display Name",
      "blocks_url": "/public/plugins/your_plugin/blocks.json",
      "script_url": "/public/plugins/your_plugin/blocks.js"
    }
  ]
}
```

### Configuration Fields

- **friendly_name**: The display name for the plugin category in Blockly
- **blocks_url**: URL to the JSON file containing block definitions for the toolbox
- **script_url**: URL to the JavaScript file containing block definitions and generators.

## Plugin Structure

Each plugin consists of:
1. **blocks.json** - JSON file defining which blocks to add to the toolbox
2. **blocks.js** - JavaScript file containing Blockly.Blocks definitions and Python generators

### Block Definition Files (blocks.json)

The blocks.json file contains an array of block definitions to add to the toolbox:

```json
[
  {
    "kind": "BLOCK",
    "type": "my_custom_block"
  },
  {
    "kind": "BLOCK",
    "type": "another_block"
  }
]
```

## Plugin Scripts (blocks.js)

Plugin scripts must define:
1. **Blockly.Blocks** definitions for each block type
2. **Python generators** for Python code generation

### Example Plugin Script

```javascript
import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

// Block definition
Blockly.Blocks['my_custom_block'] = {
  init: function () {
    this.appendDummyInput()
      .appendField("My Custom Block");
    this.setOutput(true, "Number");
    this.setColour("#7b5ba5"); // purple color
    this.setTooltip("Custom block tooltip");
  }
};

// Python generator
pythonGenerator.forBlock['my_custom_block'] = function(block) {
  const code = `my_custom_function()`;
  return [code, pythonGenerator.ORDER_NONE];
};
```

**Note**: Plugin scripts are loaded as ES6 modules, so they should use import statements to access the Blockly API. This ensures they have access to the full Blockly functionality including `Blockly.Blocks` and the Python generator. Python generators must use the `pythonGenerator.forBlock` property to register block generators.

## Special Board Support

### RP2350 Board

The RP2350 board automatically gets additional blocks without requiring a plugin configuration:

- **Color LED Block**: Added to the "Control Board" category
- **Extended Servo Support**: Servo blocks now support 4 servos instead of 2
- **Script**: Loaded from `/public/plugins/2350/nonbeta_blocks.js`

## Plugin Categories

All custom plugins are organized under the "3rd Party" category in Blockly. The "3rd Party" category is positioned after the "Gamepad" category in the toolbox. Each plugin becomes a subcategory with its friendly name.

## Integration Points

The plugin system integrates with:

1. **Connection Manager**: Plugins are loaded when a connection is established
2. **Blockly Editor**: New blocks appear in the toolbox automatically
3. **Event System**: Toolbox updates are broadcast via events

## File Structure

```
public/
├── plugins/
│   ├── 2350/
│   │   └── nonbeta_blocks.js
│   ├── advanced_sensors/
│   │   ├── blocks.json
│   │   └── blocks.js
│   └── custom_motors/
│       ├── blocks.json
│       └── blocks.js
└── sample_plugin.json
```

## Development

To create a new plugin:

1. Create a plugin script with block definitions and generators
2. Add the plugin to `plugin.json` on the XRP device
3. The plugin will be automatically loaded when connecting to the XRP

## Error Handling

The plugin system includes error handling for:
- Missing or malformed `plugin.json` files
- Failed script loading
- Invalid block definitions

Errors are logged to the console but don't prevent the application from running.
