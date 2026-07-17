import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CUSTOM_EMOTIONS_CHANGED_EVENT,
} from "../emotions/customEmotionEvents";

import {
  CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
  reconcileCustomEmotionKeywordTargets,
} from "./customEmotionKeywordStore";

import {
  getOfficialVoiceKeywordEmotionTargets,
  listVoiceKeywordEmotionTargets,
  type VoiceKeywordEmotionTarget,
} from "./customVoiceKeywordEmotionCatalog";


export default function
useVoiceKeywordEmotionCatalog() {
  const [targets, setTargets] = useState<
    VoiceKeywordEmotionTarget[]
  >(
    getOfficialVoiceKeywordEmotionTargets()
  );

  const refresh = useCallback(
    async () => {
      const nextTargets =
        await listVoiceKeywordEmotionTargets();

      setTargets(nextTargets);

      reconcileCustomEmotionKeywordTargets(
        nextTargets
      );
    },
    []
  );

  useEffect(() => {
    void refresh();

    const handleCustomEmotionChange =
      () => {
        void refresh();
      };

    window.addEventListener(
      CUSTOM_EMOTIONS_CHANGED_EVENT,
      handleCustomEmotionChange
    );

    window.addEventListener(
      CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
      handleCustomEmotionChange
    );

    return () => {
      window.removeEventListener(
        CUSTOM_EMOTIONS_CHANGED_EVENT,
        handleCustomEmotionChange
      );

      window.removeEventListener(
        CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
        handleCustomEmotionChange
      );
    };
  }, [refresh]);

  return {
    targets,
    refresh,
  };
}
