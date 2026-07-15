import type { LocalLlmRuntimeState } from "./localLlmTypes";


type LocalLlmSettingsPanelProps = {
  enabled: boolean;
  modelId: string;
  runtime: LocalLlmRuntimeState;
  onChangeEnabled: (enabled: boolean) => void;
  onLoad: () => void;
  onUnload: () => void;
};


export default function LocalLlmSettingsPanel({
  enabled,
  modelId,
  runtime,
  onChangeEnabled,
  onLoad,
  onUnload,
}: LocalLlmSettingsPanelProps) {
  const isBusy =
    runtime.phase === "checking_support" ||
    runtime.phase === "downloading" ||
    runtime.phase === "loading" ||
    runtime.phase === "generating";

  return (
    <div className="grid gap-3 rounded-lg border border-sky-400 bg-sky-950/20 p-3 text-sky-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-sky-200">
            Browser-local chat model
          </div>
          <div className="mt-1 break-all text-[11px] text-sky-100/80">
            {modelId}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChangeEnabled(!enabled)}
          className={`rounded border px-3 py-1 text-xs font-bold text-white transition ${
            enabled
              ? "border-emerald-300 bg-emerald-700 hover:bg-emerald-600"
              : "border-red-300 bg-red-700 hover:bg-red-600"
          }`}
        >
          Local chat model: {enabled ? "On" : "Off"}
        </button>
      </div>

      <div className="grid gap-2 rounded border border-sky-300/60 bg-black/30 p-2 text-[11px]">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="font-bold">{runtime.status}</span>
          {runtime.device && <span>Backend: {runtime.device.toUpperCase()}</span>}
        </div>

        {(runtime.phase === "downloading" || runtime.phase === "loading") && (
          <div className="h-2 overflow-hidden rounded-full border border-sky-300/60 bg-black">
            <div
              className="h-full bg-sky-500 transition-[width] duration-300"
              style={{ width: `${runtime.progress}%` }}
            />
          </div>
        )}

        {runtime.error && (
          <div className="rounded border border-red-400 bg-red-950/30 p-2 text-red-100">
            {runtime.error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoad}
          disabled={isBusy}
          className="rounded border border-sky-300 bg-sky-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download / Load local model
        </button>

        {runtime.phase === "ready" && (
          <button
            type="button"
            onClick={onUnload}
            className="rounded border border-zinc-300 bg-zinc-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-zinc-600"
          >
            Unload model
          </button>
        )}
      </div>

      <p className="text-[10px] leading-4 text-sky-100/75">
        Local model inference runs in this browser. Model files may be downloaded on first use,
        but chat messages are not sent to a paid AI API.
      </p>
    </div>
  );
}
