import React, {
  useEffect,
  useState,
} from "react";

import {
  FaCheck,
  FaTrash,
} from "react-icons/fa";

import {
  CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
  CUSTOM_EMOTION_OPTIONS,
  deleteCustomEmotionKeywordRule,
  getCustomEmotionKeywordRules,
  getEmotionOptionByKey,
  toggleCustomEmotionKeywordRule,
  upsertCustomEmotionKeywordRule,
  type CustomEmotionKey,
  type CustomEmotionKeywordRule,
} from "../keywords/customEmotionKeywordStore";

import {
  upsertChatKeywordRule,
  type ChatKeywordEmotionKey,
} from "../keywords/customChatKeywordStore";

import {
  checkChildSafety,
} from "../safety/childSafetyEngine";

import {
  getChildSafetyPolicy,
} from "../safety/childSafetyPolicyStore";


const inputClass =
  "min-w-0 rounded border border-white bg-black px-2 py-1 text-xs text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white";

const buttonClass =
  "rounded border border-white bg-black px-3 py-1 font-bold text-white transition hover:bg-white hover:text-black";

const VOICE_KEYWORD_PRIORITY = 100;

const CHAT_KEYWORD_PRIORITY = 100;


const EmotionKeywordRulesPanel:
  React.FC = () => {
  const [
    rules,
    setRules,
  ] = useState<
    CustomEmotionKeywordRule[]
  >([]);

  const [
    phrase,
    setPhrase,
  ] = useState("");

  const [
    emotionKey,
    setEmotionKey,
  ] = useState<CustomEmotionKey>(
    "happy"
  );

  const [
    addToChatBot,
    setAddToChatBot,
  ] = useState(false);

  const [
    chatBotReply,
    setChatBotReply,
  ] = useState("");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const refreshRules = (): void => {
    setRules(
      getCustomEmotionKeywordRules()
    );
  };

  useEffect(() => {
    refreshRules();

    const handleChanged = (): void => {
      refreshRules();
    };

    window.addEventListener(
      CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
      handleChanged
    );

    window.addEventListener(
      "storage",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
        handleChanged
      );

      window.removeEventListener(
        "storage",
        handleChanged
      );
    };
  }, []);

  const handleAddRule = (): void => {
    const clean =
      phrase.trim();

    if (!clean) {
      setStatusMessage(
        "Write a voice keyword or phrase first."
      );
      return;
    }

    if (addToChatBot) {
      const cleanReply =
        chatBotReply.trim();

      if (!cleanReply) {
        setStatusMessage(
          "Write a Robot Reply before adding this keyword to ChatBot."
        );
        return;
      }

      const policy =
        getChildSafetyPolicy();
      const phraseSafety =
        checkChildSafety(
          clean,
          policy
        );
      const replySafety =
        checkChildSafety(
          cleanReply,
          policy
        );

      if (!phraseSafety.allowed) {
        setStatusMessage(
          `ChatBot keyword blocked by safety filter: ${phraseSafety.reason}`
        );
        return;
      }

      if (!replySafety.allowed) {
        setStatusMessage(
          `ChatBot reply blocked by safety filter: ${replySafety.reason}`
        );
        return;
      }
    }

    const saved =
      upsertCustomEmotionKeywordRule({
        phrase: clean,
        emotionKey,
        priority: VOICE_KEYWORD_PRIORITY,
        enabled: true,
      });

    if (addToChatBot) {
      upsertChatKeywordRule({
        phrase: clean,
        emotionKey:
          emotionKey as ChatKeywordEmotionKey,
        reply: chatBotReply,
        priority: CHAT_KEYWORD_PRIORITY,
        enabled: true,
      });
    }

    setPhrase("");
    setChatBotReply("");
    refreshRules();

    setStatusMessage(
      addToChatBot
        ? `Saved voice keyword "${saved.phrase}" and added it to ChatBot.`
        : `Saved voice keyword "${saved.phrase}" -> ${
        getEmotionOptionByKey(
          saved.emotionKey
        ).label
      }.`
    );
  };

  return (
    <div className="text-white">
      <div className="grid gap-3 rounded-xl border border-white bg-black p-3">
        <div className="grid gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
            IF VOICE CONTAINS
          </label>

          <input
            value={phrase}
            onChange={(event) =>
              setPhrase(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleAddRule();
              }
            }}
            placeholder="Example: electricity"
            className={`${inputClass} w-full`}
          />
        </div>

        <div className="grid gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
            EMOTION
          </label>

          <select
            value={emotionKey}
            onChange={(event) =>
              setEmotionKey(
                event.target.value as CustomEmotionKey
              )
            }
            className={`${inputClass} w-full`}
          >
            {CUSTOM_EMOTION_OPTIONS.map(
              (option) => (
                <option
                  key={option.key}
                  value={option.key}
                  className="bg-black text-white"
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-white">
          <input
            type="checkbox"
            checked={addToChatBot}
            onChange={(event) =>
              setAddToChatBot(
                event.target.checked
              )
            }
            className="h-4 w-4 accent-white"
          />
          Also add to ChatBot
        </label>

        {addToChatBot && (
          <div className="grid gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-zinc-300">
              ROBOT REPLY
            </label>

            <textarea
              value={chatBotReply}
              onChange={(event) =>
                setChatBotReply(
                  event.target.value
                )
              }
              className={`${inputClass} min-h-[82px] w-full resize-none`}
              placeholder="Example: That keyword makes me excited!"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleAddRule}
          className={`${buttonClass} flex w-full items-center justify-center gap-2`}
        >
          <FaCheck size={10} />
          Add voice keyword
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-300">
          Saved voice keywords
        </div>

        {rules.length === 0 ? (
          <div className="rounded-xl border border-white bg-black p-3 text-xs leading-5 text-zinc-300">
            No voice keywords yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={[
                  "flex min-h-[140px] flex-col justify-between rounded-xl border bg-black p-3 text-xs leading-5 text-white",
                  rule.enabled
                    ? "border-white"
                    : "border-zinc-600 opacity-70",
                ].join(" ")}
              >
                <div className="grid gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      Voice keyword
                    </div>
                    <div className="font-bold">
                      {rule.phrase}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      Emotion
                    </div>
                    <div>
                      {
                        getEmotionOptionByKey(
                          rule.emotionKey
                        ).label
                      }
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      Voice action:
                    </div>
                    <div className="text-zinc-200">
                      The robot changes to this emotion.
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleCustomEmotionKeywordRule(
                        rule.id
                      )
                    }
                    className="rounded border border-white bg-black px-2 py-1 text-[10px] font-bold text-white transition hover:bg-white hover:text-black"
                  >
                    {rule.enabled
                      ? "Enabled"
                      : "Disabled"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCustomEmotionKeywordRule(
                        rule.id
                      )
                    }
                    className="rounded border border-red-400 bg-black px-2 py-1 text-[10px] font-bold text-red-300 transition hover:bg-red-500 hover:text-white"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <FaTrash size={10} />
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="mt-4 rounded-lg border border-white bg-black px-3 py-2 text-xs font-semibold text-white">
          {statusMessage}
        </div>
      )}
    </div>
  );
};


export default EmotionKeywordRulesPanel;
