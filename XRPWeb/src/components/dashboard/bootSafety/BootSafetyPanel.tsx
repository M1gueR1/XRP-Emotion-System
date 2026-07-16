import { useEffect, useState } from "react";

import AppMgr, { EventType } from "@/managers/appmgr";

import type { BootSafetyReport } from "./bootSafetyLogic";
import {
  defaultBootSafetyClient,
  type BootSafetyClient,
} from "./bootSafetyService";

type BootSafetyPanelProps = {
  client?: BootSafetyClient;
};

function mainSummary(report: BootSafetyReport | null): string {
  if (!report) return "Inspect the board to check /main.py.";
  if (report.mainExists === false) return "Current /main.py: Not found";
  if (report.mainIsSafe) return "Current /main.py: Safe development boot file";
  if (report.autorunDetected) return "Current /main.py: Autorun detected";
  return "Current /main.py: No recognized autorun pattern";
}

function recommendation(report: BootSafetyReport | null): string {
  if (!report) return "Recommended action: Inspect boot files";
  if (report.mainIsSafe) return "Recommended action: No action needed";
  if (report.autorunDetected)
    return "Recommended action: Disable autorun safely";
  return "Recommended action: Review the preview before making changes";
}

export default function BootSafetyPanel({
  client = defaultBootSafetyClient,
}: BootSafetyPanelProps) {
  const [connected, setConnected] = useState(() => client.isConnected());
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [status, setStatus] = useState(
    client.isConnected() ? "Ready" : "Not connected",
  );
  const [report, setReport] = useState<BootSafetyReport | null>(null);
  const [selectedBackup, setSelectedBackup] = useState("");

  useEffect(() => {
    const appMgr = AppMgr.getInstance();
    const handleConnectionStatus = (): void => {
      const isConnected = client.isConnected();
      setConnected(isConnected);
      if (!isConnected) {
        setStatus("Not connected");
      }
    };

    appMgr.on(EventType.EVENT_CONNECTION_STATUS, handleConnectionStatus);
    return () => {
      appMgr.eventOff(EventType.EVENT_CONNECTION_STATUS, handleConnectionStatus);
    };
  }, [client]);

  useEffect(() => {
    if (report?.backups.length) {
      setSelectedBackup((current) =>
        report.backups.includes(current) ? current : report.backups[0],
      );
    } else {
      setSelectedBackup("");
    }
  }, [report]);

  const runAction = async (
    progressText: string,
    action: () => Promise<BootSafetyReport>,
  ): Promise<void> => {
    if (!connected) {
      setStatus("Not connected");
      return;
    }

    setBusyAction(progressText);
    setStatus(progressText);
    try {
      const nextReport = await action();
      setReport(nextReport);
      setStatus(nextReport.message);
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusyAction(null);
      setConnected(client.isConnected());
    }
  };

  const handleDisable = (): void => {
    const confirmed = window.confirm(
      "This will back up /main.py and replace it with a safe boot file so the XRP does not automatically run a user program every time it reconnects or resets. Continue?",
    );
    if (!confirmed) return;
    void runAction("Backing up /main.py and writing safe main.py...", () =>
      client.disableAutorun(),
    );
  };

  const handleRestore = (): void => {
    if (!selectedBackup) {
      setStatus("No autorun backup found.");
      return;
    }

    const confirmed = window.confirm(
      `Restore ${selectedBackup} to /main.py? The current non-safe /main.py will be backed up first.`,
    );
    if (!confirmed) return;
    void runAction("Restoring autorun backup...", () =>
      client.restoreAutorun(selectedBackup),
    );
  };

  const disabled = !connected || busyAction !== null;

  return (
    <section
      aria-label="XRP Boot Safety / Autorun Tools"
      className="grid gap-3 rounded-xl border border-white bg-black p-3 text-white"
    >
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-white">
          XRP Boot Safety / Autorun Tools
        </div>
        <p className="mt-1 text-[11px] leading-4 text-zinc-300">
          Boot Safety helps recover the XRP when /main.py automatically runs a
          program on every reconnect or Raw REPL reset. This can cause repeated
          console spam or unexpected Red Vision initialization during file
          uploads.
        </p>
      </div>

      <div className="rounded border border-white/60 bg-zinc-950 p-2 text-[11px] leading-5">
        <div data-testid="boot-safety-connection">
          Connection: {connected ? "XRP connected" : "Not connected"}
        </div>
        <div>{mainSummary(report)}</div>
        {report?.programTarget && (
          <div>Program target: {report.programTarget}</div>
        )}
        <div>{recommendation(report)}</div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            void runAction("Inspecting /main.py...", () => client.inspect())
          }
          disabled={disabled}
          className="rounded border border-white bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-600 disabled:text-zinc-500"
        >
          Inspect boot files
        </button>
        <button
          type="button"
          onClick={handleDisable}
          disabled={disabled}
          className="rounded border border-amber-300 bg-amber-800 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Disable autorun safely
        </button>
        <button
          type="button"
          onClick={handleRestore}
          disabled={disabled || !selectedBackup}
          className="rounded border border-sky-300 bg-sky-800 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Restore autorun backup
        </button>
      </div>

      <div className="grid gap-1">
        <label
          htmlFor="boot-safety-backup"
          className="text-[10px] font-bold uppercase tracking-wide text-zinc-300"
        >
          Backup to restore
        </label>
        <select
          id="boot-safety-backup"
          value={selectedBackup}
          onChange={(event) => setSelectedBackup(event.target.value)}
          disabled={disabled || !report?.backups.length}
          className="rounded border border-white bg-black px-2 py-1 text-xs text-white disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {!report?.backups.length && <option value="">No backup found</option>}
          {report?.backups.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded border border-amber-300/70 bg-amber-950/30 p-2 text-[10px] leading-4 text-amber-100">
        Use this only when developing or recovering the robot. For a final demo,
        you may want to restore autorun. Boot Safety never silently deletes
        /main.py or overwrites an existing backup.
      </div>

      <div
        role="status"
        className="rounded border border-white/50 bg-zinc-950 p-2 text-[11px] text-white"
      >
        {status}
      </div>

      {report?.mainPreview && (
        <details className="rounded border border-white/40 bg-zinc-950 p-2">
          <summary className="cursor-pointer text-[11px] font-bold">
            View current main.py preview
          </summary>
          <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-4 text-zinc-300">
            {report.mainPreview}
          </pre>
        </details>
      )}
    </section>
  );
}
