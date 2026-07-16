import AppMgr from "@/managers/appmgr";
import { CommandToXRPMgr } from "@/managers/commandstoxrpmgr";

import {
  buildDisableAutorunScript,
  buildInspectScript,
  buildRestoreAutorunScript,
  parseBootSafetyOutput,
  type BootSafetyReport,
} from "./bootSafetyLogic";

export type BootSafetyClient = {
  isConnected: () => boolean;
  inspect: () => Promise<BootSafetyReport>;
  disableAutorun: () => Promise<BootSafetyReport>;
  restoreAutorun: (backupPath: string) => Promise<BootSafetyReport>;
};

export type BootSafetyScriptExecutor = (script: string) => Promise<string>;

function assertSuccessfulReport(report: BootSafetyReport): BootSafetyReport {
  if (report.status !== "OK") {
    throw new Error(report.message);
  }

  return report;
}

export function createBootSafetyClient(
  executeScript: BootSafetyScriptExecutor,
  isConnected: () => boolean,
): BootSafetyClient {
  const execute = async (script: string): Promise<BootSafetyReport> =>
    assertSuccessfulReport(parseBootSafetyOutput(await executeScript(script)));

  return {
    isConnected,
    inspect: () => execute(buildInspectScript()),
    disableAutorun: () => execute(buildDisableAutorunScript()),
    restoreAutorun: (backupPath: string) =>
      execute(buildRestoreAutorunScript(backupPath)),
  };
}

const executeOnConnectedXrp: BootSafetyScriptExecutor = async (script) => {
  const output = await CommandToXRPMgr.getInstance().executeRawUtility(
    script,
    "BOOT_SAFETY:SCRIPT_DONE",
  );
  return output.join("\r\n");
};

export const defaultBootSafetyClient = createBootSafetyClient(
  executeOnConnectedXrp,
  () => {
    try {
      return AppMgr.getInstance().getConnection()?.isConnected() ?? false;
    } catch {
      return false;
    }
  },
);

