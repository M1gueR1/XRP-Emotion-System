const CUSTOM_SHEETS_DIRECTORY = "/emotion_sheets_custom";
const CUSTOM_MANIFEST_PATH = `${CUSTOM_SHEETS_DIRECTORY}/manifest.json`;

function pythonStringLiteral(value: string): string {
  return JSON.stringify(value);
}

export function buildDeleteCustomEmotionScript(
  emotionName: string,
): string {
  if (!/^[a-z][a-z0-9_]{0,31}$/.test(emotionName)) {
    throw new Error(
      "Invalid custom emotion name for Red Vision deletion.",
    );
  }

  const imagePath = `${CUSTOM_SHEETS_DIRECTORY}/${emotionName}.png`;

  return [
    "import os, ujson",
    `emotion_name = ${pythonStringLiteral(emotionName)}`,
    `manifest_path = ${pythonStringLiteral(CUSTOM_MANIFEST_PATH)}`,
    "manifest_exists = True",
    "try:",
    " manifest_file = open(manifest_path, 'r')",
    " manifest = ujson.loads(manifest_file.read())",
    " manifest_file.close()",
    "except OSError:",
    " manifest_exists = False",
    " manifest = {}",
    "if emotion_name in manifest:",
    " del manifest[emotion_name]",
    " if manifest_exists:",
    "  manifest_temp_path = manifest_path + '.tmp'",
    "  manifest_file = open(manifest_temp_path, 'w')",
    "  manifest_file.write(ujson.dumps(manifest))",
    "  manifest_file.close()",
    "  os.remove(manifest_path)",
    "  os.rename(manifest_temp_path, manifest_path)",
    `image_path = ${pythonStringLiteral(imagePath)}`,
    "try:",
    " os.remove(image_path)",
    "except OSError:",
    " pass",
    "try:",
    " os.remove(image_path + '.tmp')",
    "except OSError:",
    " pass",
    `print(${pythonStringLiteral(`DELETE_OK ${emotionName}`)})`,
  ].join("\n");
}

