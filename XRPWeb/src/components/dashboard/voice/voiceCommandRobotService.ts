import AppMgr from "../../../managers/appmgr";

import type {
  OfficialVoiceCommandAction,
  VoiceCommandAction,
} from "./voiceCommandTypes";

import {
  serializeDynamicCustomVoiceCommand,
  type DynamicCustomVoiceCommand,
} from "./customVoiceCommandProtocol";


export type RuntimeVoiceCommandAction =
  Exclude<
    OfficialVoiceCommandAction,
    | "unknown"
    | "turn_idle"
    | "turn_upset"
  >;


export function isRuntimeVoiceCommandAction(
  action: VoiceCommandAction
): action is RuntimeVoiceCommandAction {
  return Object.prototype.hasOwnProperty.call(
    VOICE_RUNTIME_COMMANDS,
    action
  );
}


export const VOICE_RUNTIME_COMMANDS: Record<
  RuntimeVoiceCommandAction,
  string
> = {
  turn_happy: "V:H",
  turn_sad: "V:S",
  turn_excited: "V:E",
  turn_in_love: "V:I",

  turn_right: "V:R",
  turn_left: "V:L",
  turn_back: "V:B",

  /*
   * Keep V:S reserved for turn_sad.
   * Use separate tokens for runtime macros/safety.
   */
  stop: "V:X",
  showtime: "V:D",
  go_to_sleep: "V:Z",
  lets_play: "V:P",
};


export function serializeVoiceRuntimeCommand(
  action: VoiceCommandAction
): string | null {
  if (!isRuntimeVoiceCommandAction(action)) {
    return null;
  }

  return `${VOICE_RUNTIME_COMMANDS[action]}\n`;
}


function getConnectedXrpConnection() {
  const appMgr = AppMgr.getInstance();
  const connection = appMgr.getConnection();

  if (
    !connection ||
    !connection.isConnected()
  ) {
    throw new Error(
      "XRP is not connected. Connect the XRP before using voice commands."
    );
  }

  return connection;
}


export async function sendVoiceRuntimeCommandToXrp(
  action: VoiceCommandAction
): Promise<void> {
  if (
    !isRuntimeVoiceCommandAction(
      action
    )
  ) {
    return;
  }

  const payload =
    serializeVoiceRuntimeCommand(action);

  if (payload === null) {
    return;
  }

  const connection =
    getConnectedXrpConnection();

  await connection.writeToDevice(
    payload
  );
}


export async function
sendDynamicCustomVoiceCommandToXrp(
  command: DynamicCustomVoiceCommand
): Promise<void> {
  const payload =
    serializeDynamicCustomVoiceCommand(
      command
    );

  const connection =
    getConnectedXrpConnection();

  await connection.writeToDevice(payload);
}
