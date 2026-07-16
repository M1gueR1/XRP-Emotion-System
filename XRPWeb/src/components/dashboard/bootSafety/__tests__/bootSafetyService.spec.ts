import { describe, expect, it, vi } from "vitest";

import { createBootSafetyClient } from "../bootSafetyService";

describe("Boot Safety Raw REPL boundary", () => {
  it("sends a standalone inspect script through the injected executor", async () => {
    const execute = vi.fn(async (_script: string) => `BOOT_SAFETY:STATUS=OK
BOOT_SAFETY:ACTION=INSPECT
BOOT_SAFETY:MESSAGE=Boot files inspected`);
    const client = createBootSafetyClient(execute, () => true);
    const result = await client.inspect();
    expect(execute).toHaveBeenCalledOnce();
    expect(execute.mock.calls[0][0]).toContain("BOOT_SAFETY:ACTION=INSPECT");
    expect(execute.mock.calls[0][0]).not.toContain("EmotionLib");
    expect(result.status).toBe("OK");
  });

  it("surfaces board error sentinels as rejected actions", async () => {
    const client = createBootSafetyClient(
      async () => `BOOT_SAFETY:STATUS=ERROR
BOOT_SAFETY:MESSAGE=No autorun backup found`,
      () => true,
    );
    await expect(client.restoreAutorun("/main_autorun_backup.py")).rejects.toThrow(
      "No autorun backup found",
    );
  });
});
