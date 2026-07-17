import type {
  CustomVoiceCommandMetadata,
} from "./voiceCommandTypes";

import type {
  DynamicCustomVoiceCommand,
} from "./customVoiceCommandProtocol";


export type CustomVoiceCommandDispatchDependencies = {
  previewEmotion: (
    emotionId: number
  ) => void;
  sendCommand: (
    command: DynamicCustomVoiceCommand
  ) => Promise<void>;
};


export async function dispatchCustomVoiceCommand(
  command: CustomVoiceCommandMetadata,
  dependencies:
    CustomVoiceCommandDispatchDependencies
): Promise<void> {
  if (command.targetMissing) {
    throw new Error(
      `Custom voice keyword "${command.phrase}" targets a missing emotion. Select another emotion to reactivate it.`
    );
  }

  if (command.automaticallyPlayEmotion) {
    dependencies.previewEmotion(
      command.targetEmotionId
    );
  }

  await dependencies.sendCommand({
    commandId: command.commandId,
    emotionId: command.targetEmotionId,
  });
}
