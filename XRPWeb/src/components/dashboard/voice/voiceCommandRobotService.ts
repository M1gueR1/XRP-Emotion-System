import AppMgr from "../../../managers/appmgr";

import type {
  VoiceCommandAction,
} from "./useVoiceCommands";


const VOICE_RUNTIME_COMMANDS: Record<
  Exclude<
    VoiceCommandAction,
    "unknown"
  >,
  string
> = {
  turn_happy: "V:H",
  turn_sad: "V:S",
  turn_right: "V:R",
  turn_left: "V:L",
};


export async function sendVoiceRuntimeCommandToXrp(
  action: VoiceCommandAction
): Promise<void> {
  if (action === "unknown") {
    return;
  }

  const appMgr =
    AppMgr.getInstance();

  const connection =
    appMgr.getConnection();

  if (
    !connection ||
    !connection.isConnected()
  ) {
    throw new Error(
      "XRP is not connected. Connect the XRP before using movement voice commands."
    );
  }

  const command =
    VOICE_RUNTIME_COMMANDS[action];

  await connection.writeToDevice(
    `${command}\n`
  );
}
