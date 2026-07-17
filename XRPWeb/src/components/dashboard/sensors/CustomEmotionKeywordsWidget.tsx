import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCheck,
  FaKey,
  FaPlay,
  FaTrash,
} from "react-icons/fa";

import SensorCard from "./SensorCard";

import {
  useGridStackWidget,
} from "../hooks/useGridStackWidget";

import {
  CUSTOM_EMOTION_KEYWORDS_CHANGED_EVENT,
  deleteCustomEmotionKeywordRule,
  findMatchingCustomEmotionKeyword,
  getCustomEmotionKeywordRules,
  toggleCustomEmotionKeywordRule,
  upsertCustomEmotionKeywordRule,
  type CustomEmotionKeywordRule,
} from "../keywords/customEmotionKeywordStore";

import useVoiceKeywordEmotionCatalog from
  "../keywords/useVoiceKeywordEmotionCatalog";


const panelClass =
  "rounded-xl border border-white bg-black p-3 text-white";

const inputClass =
  "min-w-0 rounded border border-white bg-black px-2 py-1 text-xs text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white";

const buttonClass =
  "rounded border border-white bg-black px-3 py-1 font-bold text-white transition hover:bg-white hover:text-black";

const dangerButtonClass =
  "rounded border border-red-400 bg-black p-2 text-red-300 transition hover:bg-red-500 hover:text-white";


function emitDashboardEmotionPreview(
  rule: CustomEmotionKeywordRule,
  text: string
): void {
  window.dispatchEvent(
    new CustomEvent(
      "xrp:dashboard-emotion-preview",
      {
        detail: {
          source:
            "custom_emotion_keyword",
          emotionId:
            rule.targetEmotionId,
          emotionLabel:
            rule.targetEmotionDisplayName,
          signal:
            rule.phrase,
          confidence:
            rule.priority / 100,
          reason:
            `Custom keyword "${rule.phrase}" matched in: ${text}`,
        },
      }
    )
  );
}


const CustomEmotionKeywordsWidget:
  React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

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
    selectedEmotionId,
    setSelectedEmotionId,
  ] = useState(1);

  const { targets } =
    useVoiceKeywordEmotionCatalog();

  const [
    priority,
    setPriority,
  ] = useState(80);

  const [
    testText,
    setTestText,
  ] = useState(
    "Colombia lost the match"
  );

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

  const matchedRule =
    useMemo(
      () =>
        findMatchingCustomEmotionKeyword(
          testText
        ),
      [
        rules,
        testText,
      ]
    );

  const handleAddRule = (): void => {
    const clean =
      phrase.trim();

    if (!clean) {
      setStatusMessage(
        "Write a keyword or phrase first."
      );
      return;
    }

    const targetEmotion = targets.find(
      (target) =>
        target.emotionId ===
        selectedEmotionId
    );

    if (!targetEmotion) {
      setStatusMessage(
        "Select a valid emotion."
      );
      return;
    }

    let created: CustomEmotionKeywordRule;

    try {
      created =
        upsertCustomEmotionKeywordRule({
          phrase: clean,
          targetEmotion,
          priority,
          enabled: true,
          automaticallyPlayEmotion: true,
          exposeInBlockly: true,
        });
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : String(error)
      );
      return;
    }

    setPhrase("");

    setStatusMessage(
      `Saved "${created.phrase}" -> ${
        created.targetEmotionDisplayName
      }.`
    );
  };

  const handleTestAndPreview = (): void => {
    const match =
      findMatchingCustomEmotionKeyword(
        testText
      );

    if (!match) {
      setStatusMessage(
        "No keyword matched this text."
      );
      return;
    }

    if (match.rule.targetMissing) {
      setStatusMessage(
        `Target missing: ${match.rule.targetEmotionDisplayName}. Select another emotion to reactivate this command.`
      );
      return;
    }

    emitDashboardEmotionPreview(
      match.rule,
      testText
    );

    setStatusMessage(
      `Matched "${match.rule.phrase}" -> ${
        match.rule.targetEmotionDisplayName
      }.`
    );
  };

  const isConnected =
    rules.some(
      (rule) => rule.enabled
    );

  return (
    <SensorCard
      title="Emotion Keywords"
      icon={<FaKey size={16} />}
      onStart={() => {}}
      onStop={() => {}}
      isConnected={isConnected}
      lastUpdated={
        rules[0]?.updatedAt
      }
    >
      <div className="absolute right-4 top-4">
        <button
          onClick={handleDelete}
          className={dangerButtonClass}
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col gap-3 overflow-auto rounded-xl bg-black p-3 pt-10 text-xs text-white">
        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Add keyword rule
          </div>

          <div className="grid gap-2">
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
              placeholder="Colombia lost"
              className={`${inputClass} w-full`}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedEmotionId}
                onChange={(event) =>
                  setSelectedEmotionId(
                    Number(event.target.value)
                  )
                }
                className={`${inputClass} w-full`}
              >
                <optgroup label="Official emotions">
                  {targets
                    .filter(
                      (target) =>
                        target.source === "official"
                    )
                    .map((option) => (
                    <option
                      key={`official-${option.emotionId}`}
                      value={option.emotionId}
                      className="bg-black text-white"
                    >
                      {option.displayName}
                    </option>
                    ))}
                </optgroup>

                {targets.some(
                  (target) =>
                    target.source === "custom"
                ) && (
                  <optgroup label="Custom emotions">
                    {targets
                      .filter(
                        (target) =>
                          target.source === "custom"
                      )
                      .map((option) => (
                        <option
                          key={`custom-${option.emotionId}`}
                          value={option.emotionId}
                          className="bg-black text-white"
                        >
                          {option.displayName} ★
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              <input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(event) =>
                  setPriority(
                    Math.min(
                      Math.max(
                        Number(event.target.value),
                        1
                      ),
                      100
                    )
                  )
                }
                className={`${inputClass} w-full`}
                title="Priority"
              />
            </div>

            <button
              type="button"
              onClick={handleAddRule}
              className={`${buttonClass} flex items-center justify-center gap-2`}
            >
              <FaCheck size={10} />
              Save keyword
            </button>
          </div>

          <div className="mt-2 text-[10px] leading-4 text-zinc-300">
            Higher priority wins when multiple keywords match.
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Saved rules
          </div>

          {rules.length === 0 ? (
            <div className="text-zinc-300">
              No keyword rules yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={[
                    "rounded-lg border p-2 text-white",
                    rule.enabled
                      ? "border-white bg-black"
                      : "border-zinc-600 bg-zinc-950 opacity-70",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">
                        {rule.phrase}
                      </div>

                      <div className="mt-1 text-[11px] text-zinc-300">
                        {rule.targetMissing
                          ? `Target missing: ${rule.targetEmotionDisplayName}`
                          : rule.targetEmotionDisplayName}{" "}
                        · priority {rule.priority}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCustomEmotionKeywordRule(
                          rule.id
                        )
                      }
                      className="rounded border border-red-400 bg-black px-1.5 py-1 text-red-300 hover:bg-red-500 hover:text-white"
                      title="Delete rule"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      toggleCustomEmotionKeywordRule(
                        rule.id
                      )
                    }
                    className="mt-2 rounded border border-white bg-black px-2 py-1 text-[10px] font-bold text-white hover:bg-white hover:text-black"
                  >
                    {rule.enabled
                      ? "Enabled"
                      : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Test keyword
          </div>

          <textarea
            value={testText}
            onChange={(event) =>
              setTestText(
                event.target.value
              )
            }
            rows={3}
            className={`${inputClass} w-full resize-none`}
            placeholder="Write a sentence to test..."
          />

          <div className="mt-2 rounded-lg border border-white bg-black p-2 text-white">
            {matchedRule ? (
              <>
                <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                  Match
                </div>

                <div className="mt-1 font-bold text-white">
                  {matchedRule.rule.phrase} →{" "}
                  {matchedRule.rule.targetEmotionDisplayName}
                </div>
              </>
            ) : (
              <div className="text-zinc-300">
                No match yet.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTestAndPreview}
            className={`${buttonClass} mt-2 flex items-center justify-center gap-2`}
          >
            <FaPlay size={10} />
            Test & preview
          </button>
        </div>

        {statusMessage && (
          <div className="rounded-lg border border-white bg-black px-3 py-2 font-semibold text-white">
            {statusMessage}
          </div>
        )}

        <div className="rounded-xl border border-white bg-black p-3 text-[10px] leading-4 text-white">
          These keywords are local and configurable by the teacher/student.
          Later the Robot Chat and voice layers can use the same rules.
        </div>
      </div>
    </SensorCard>
  );
};


export default CustomEmotionKeywordsWidget;
