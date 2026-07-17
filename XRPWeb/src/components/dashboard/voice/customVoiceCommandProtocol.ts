import {
  CUSTOM_VOICE_COMMAND_ID_MAX,
  CUSTOM_VOICE_COMMAND_ID_MIN,
} from "../keywords/customEmotionKeywordStore";


export const CUSTOM_VOICE_EMOTION_ID_MIN = 0;
export const CUSTOM_VOICE_EMOTION_ID_MAX = 255;


export type DynamicCustomVoiceCommand = {
  commandId: number;
  emotionId: number;
};


export function serializeDynamicCustomVoiceCommand(
  command: DynamicCustomVoiceCommand
): string {
  if (
    !Number.isInteger(command.commandId) ||
    command.commandId <
      CUSTOM_VOICE_COMMAND_ID_MIN ||
    command.commandId >
      CUSTOM_VOICE_COMMAND_ID_MAX
  ) {
    throw new Error(
      `Custom commandId must be between ${CUSTOM_VOICE_COMMAND_ID_MIN} and ${CUSTOM_VOICE_COMMAND_ID_MAX}.`
    );
  }

  if (
    !Number.isInteger(command.emotionId) ||
    command.emotionId <
      CUSTOM_VOICE_EMOTION_ID_MIN ||
    command.emotionId >
      CUSTOM_VOICE_EMOTION_ID_MAX
  ) {
    throw new Error(
      `Emotion ID must be between ${CUSTOM_VOICE_EMOTION_ID_MIN} and ${CUSTOM_VOICE_EMOTION_ID_MAX}.`
    );
  }

  return (
    `V2:C:${command.commandId}:` +
    `${command.emotionId}\n`
  );
}
