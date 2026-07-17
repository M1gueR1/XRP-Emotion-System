import {
  CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
  getCustomEmotionKeywordRules,
  reconcileCustomEmotionKeywordTargets,
} from "../dashboard/keywords/customEmotionKeywordStore";

import {
  CUSTOM_EMOTIONS_CHANGED_EVENT,
} from "../dashboard/emotions/customEmotionEvents";

import {
  listVoiceKeywordEmotionTargets,
} from "../dashboard/keywords/customVoiceKeywordEmotionCatalog";


export type BlocklyVoiceCommandOption = [
  string,
  string,
];


export const OFFICIAL_VOICE_COMMAND_OPTIONS:
  BlocklyVoiceCommandOption[] = [
  ["turn right", "turn_right"],
  ["turn left", "turn_left"],
  ["move back", "turn_back"],
  ["stop", "stop"],
  ["showtime", "showtime"],
  ["go to sleep", "go_to_sleep"],
  ["let's play", "lets_play"],
  ["turn happy", "turn_happy"],
  ["turn sad", "turn_sad"],
  ["turn excited", "turn_excited"],
  ["turn in love", "turn_in_love"],
];


export const BLOCKLY_VOICE_COMMAND_CATALOG_CHANGED_EVENT =
  "xrp:blockly-voice-command-catalog-changed";


const missingCommandKeys =
  new Set<string>();

let initialized = false;


function emitCatalogChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      BLOCKLY_VOICE_COMMAND_CATALOG_CHANGED_EVENT
    )
  );
}


async function reconcileTargets():
  Promise<void> {
  const targets =
    await listVoiceKeywordEmotionTargets();

  reconcileCustomEmotionKeywordTargets(
    targets
  );

  emitCatalogChanged();
}


export function registerMissingCustomVoiceCommand(
  commandKey: string
): void {
  if (/^custom:\d+$/.test(commandKey)) {
    missingCommandKeys.add(commandKey);
  }
}


export function getVoiceCommandDropdownOptions(
  currentValue?: string | null
): BlocklyVoiceCommandOption[] {
  if (currentValue) {
    registerMissingCustomVoiceCommand(
      currentValue
    );
  }

  const rules =
    getCustomEmotionKeywordRules();

  const activeCommandKeys = new Set(
    rules
      .filter(
        (rule) =>
          rule.enabled &&
          rule.exposeInBlockly
      )
      .map((rule) => rule.commandKey)
  );

  const customOptions = rules
    .filter(
      (rule) =>
        rule.enabled &&
        rule.exposeInBlockly
    )
    .map(
      (rule) => [
        rule.targetMissing
          ? `${rule.phrase} → Target missing: ${rule.targetEmotionDisplayName}`
          : `${rule.phrase} → ${rule.targetEmotionDisplayName} ★`,
        rule.commandKey,
      ] as BlocklyVoiceCommandOption
    );

  const missingOptions = Array.from(
    missingCommandKeys
  )
    .filter(
      (commandKey) =>
        !activeCommandKeys.has(
          commandKey as `custom:${number}`
        )
    )
    .map((commandKey) => {
      const commandId =
        commandKey.split(":")[1];

      return [
        `Missing custom voice command #${commandId}`,
        commandKey,
      ] as BlocklyVoiceCommandOption;
    });

  return [
    ...OFFICIAL_VOICE_COMMAND_OPTIONS,
    ...customOptions,
    ...missingOptions,
  ];
}


export function initializeCustomVoiceCommandCatalog():
  void {
  if (
    initialized ||
    typeof window === "undefined"
  ) {
    return;
  }

  initialized = true;

  window.addEventListener(
    CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
    emitCatalogChanged
  );

  window.addEventListener(
    CUSTOM_EMOTIONS_CHANGED_EVENT,
    () => {
      void reconcileTargets();
    }
  );

  void reconcileTargets();
}


initializeCustomVoiceCommandCatalog();
