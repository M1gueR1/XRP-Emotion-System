import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import BootSafetyPanel from "../BootSafetyPanel";
import type { BootSafetyReport } from "../bootSafetyLogic";
import type { BootSafetyClient } from "../bootSafetyService";

const report: BootSafetyReport = {
  status: "OK",
  action: "INSPECT",
  message: "Boot files inspected",
  mainExists: true,
  mainIsSafe: false,
  autorunDetected: true,
  pruebaAutorunDetected: true,
  programTarget: "/prueba.py",
  backups: ["/main_autorun_backup.py"],
  mainPreview: "exec(open('/prueba.py').read())",
  fields: {},
};

function client(connected: boolean): BootSafetyClient {
  return {
    isConnected: vi.fn(() => connected),
    inspect: vi.fn(async () => report),
    disableAutorun: vi.fn(async () => ({
      ...report,
      action: "DISABLE_AUTORUN",
      message: "Autorun disabled safely",
      mainIsSafe: true,
      autorunDetected: false,
    })),
    restoreAutorun: vi.fn(async () => ({
      ...report,
      action: "RESTORE_AUTORUN",
      message: "Autorun restored",
    })),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BootSafetyPanel", () => {
  it("disables all board actions when no XRP is connected", () => {
    render(<BootSafetyPanel client={client(false)} />);
    expect(screen.getByRole("button", { name: "Inspect boot files" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disable autorun safely" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restore autorun backup" })).toBeDisabled();
    expect(screen.getByTestId("boot-safety-connection")).toHaveTextContent("Not connected");
  });

  it("asks for confirmation before disabling autorun", async () => {
    const fakeClient = client(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BootSafetyPanel client={fakeClient} />);
    fireEvent.click(screen.getByRole("button", { name: "Disable autorun safely" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(fakeClient.disableAutorun).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Disable autorun safely" }));
    await waitFor(() => expect(fakeClient.disableAutorun).toHaveBeenCalledOnce());
  });

  it("asks for confirmation before restoring the selected backup", async () => {
    const fakeClient = client(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BootSafetyPanel client={fakeClient} />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect boot files" }));
    await screen.findByText("Program target: /prueba.py");
    fireEvent.click(screen.getByRole("button", { name: "Restore autorun backup" }));
    expect(confirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(fakeClient.restoreAutorun).toHaveBeenCalledWith(
        "/main_autorun_backup.py",
      ),
    );
  });
});

