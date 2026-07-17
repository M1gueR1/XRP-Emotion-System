import {
  listCustomEmotions,
} from "../emotions/customEmotionStore";

import {
  OFFICIAL_EMOTIONS,
} from "../emotions/officialEmotionCatalog";


export type VoiceKeywordEmotionSource =
  | "official"
  | "custom";


export type VoiceKeywordEmotionTarget = {
  emotionId: number;
  uniqueName: string;
  displayName: string;
  source: VoiceKeywordEmotionSource;
};


const OFFICIAL_TARGETS:
  VoiceKeywordEmotionTarget[] =
  OFFICIAL_EMOTIONS.map(
    (emotion) => ({
      emotionId: emotion.id,
      uniqueName: emotion.uniqueName,
      displayName: emotion.displayName,
      source: "official",
    })
  );


export function
getOfficialVoiceKeywordEmotionTargets():
  VoiceKeywordEmotionTarget[] {
  return OFFICIAL_TARGETS.map(
    (target) => ({ ...target })
  );
}


export function
getOfficialVoiceKeywordEmotionTargetById(
  emotionId: number
): VoiceKeywordEmotionTarget | undefined {
  return OFFICIAL_TARGETS.find(
    (target) =>
      target.emotionId === emotionId
  );
}


export async function
listVoiceKeywordEmotionTargets():
  Promise<VoiceKeywordEmotionTarget[]> {
  let customTargets:
    VoiceKeywordEmotionTarget[] = [];

  try {
    const customEmotions =
      await listCustomEmotions();

    customTargets = customEmotions.map(
      (emotion) => ({
        emotionId: emotion.emotionId,
        uniqueName: emotion.uniqueName,
        displayName: emotion.displayName,
        source: "custom",
      })
    );
  } catch (error) {
    console.error(
      "Could not load custom emotions for voice keywords:",
      error
    );
  }

  return [
    ...getOfficialVoiceKeywordEmotionTargets(),
    ...customTargets.sort(
      (first, second) =>
        first.displayName.localeCompare(
          second.displayName
        )
    ),
  ];
}
