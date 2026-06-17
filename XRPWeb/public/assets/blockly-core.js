// Shim for blockly/core - exports the global Blockly instance
const Blockly = window.Blockly;

// Export default
export default Blockly;

// Re-export all properties and methods as named exports
export const {
  Blocks,
  BlockSvg,
  Connection,
  Events,
  Field,
  FieldAngle,
  FieldCheckbox,
  FieldColour,
  FieldDropdown,
  FieldImage,
  FieldLabel,
  FieldMultilineInput,
  FieldNumber,
  FieldTextInput,
  FieldVariable,
  Generator,
  Gesture,
  Input,
  Msg,
  Names,
  Options,
  Procedures,
  Theme,
  Tooltip,
  VariableModel,
  Variables,
  Workspace,
  WorkspaceSvg,
  Xml,
  utils,
  serialization,
  dialog,
  defineBlocksWithJsonArray,
  inject,
  common,
  blockRendering,
  geras,
  minimalist,
  thrasos,
  zelos
} = Blockly;

// Also export any additional methods directly
export const defineBlocks = Blockly.defineBlocks;
export const getMainWorkspace = Blockly.getMainWorkspace;
export const svgResize = Blockly.svgResize;

