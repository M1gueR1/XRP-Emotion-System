import AppMgr from "../../../managers/appmgr";

import type {
  VoiceCommandAction,
} from "./useVoiceCommands";


type RuntimeVoiceCommandAction =
  Exclude<
    VoiceCommandAction,
    | "unknown"
    | "turn_idle"
    | "turn_upset"
  >;


function isRuntimeVoiceCommandAction(
  action: VoiceCommandAction
): action is RuntimeVoiceCommandAction {
  return (
    action !== "unknown" &&
    action !== "turn_idle" &&
    action !== "turn_upset"
  );
}


const VOICE_RUNTIME_COMMANDS: Record<
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

  const appMgr =
    AppMgr.getInstance();

  const connection =
    appMgr.getConnection();

  if (
    !connection ||
    !connection.isConnected()
  ) {
    throw new Error(
      "XRP is not connected. Connect the XRP before using voice commands."
    );
  }

  const command =
    VOICE_RUNTIME_COMMANDS[action];

  await connection.writeToDevice(
    `${command}
`
  );
}
