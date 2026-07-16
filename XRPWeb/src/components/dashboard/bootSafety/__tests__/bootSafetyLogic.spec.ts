import { describe, expect, it } from "vitest";

import {
  BOOT_SAFETY_MARKER,
  SAFE_MAIN_CONTENT,
  analyzeMainContent,
  parseBootSafetyOutput,
  selectBackupPath,
} from "../bootSafetyLogic";

const DISCOVERED_MAIN = `import os
import sys
try:
   with open('/prueba.py', mode='r') as exfile:
       code = exfile.read()
   execCode = compile(code, 'prueba.py', 'exec')
   exec(execCode)
except Exception as e:
   sys.print_exception(e)
`;

describe("Boot Safety pure logic", () => {
  it("generates a safe main without user-program or Red Vision imports", () => {
    expect(SAFE_MAIN_CONTENT).not.toMatch(/exec\s*\(\s*open\s*\(\s*["']\/prueba\.py/);
    expect(SAFE_MAIN_CONTENT).not.toContain("EmotionLib");
    expect(SAFE_MAIN_CONTENT).not.toContain("rv_init");
    expect(SAFE_MAIN_CONTENT).toMatch(
      /try:[\s\S]*import XRPLib\.resetbot[\s\S]*except Exception:/,
    );
  });

  it("detects the discovered autorun main", () => {
    const analysis = analyzeMainContent(DISCOVERED_MAIN);
    expect(analysis.autorunDetected).toBe(true);
    expect(analysis.pruebaAutorunDetected).toBe(true);
    expect(analysis.programTarget).toBe("/prueba.py");
  });

  it("detects single-quoted /prueba.py autorun", () => {
    expect(analyzeMainContent("exec(open('/prueba.py').read())").pruebaAutorunDetected).toBe(true);
  });

  it("detects double-quoted /prueba.py autorun", () => {
    expect(analyzeMainContent('exec(open("/prueba.py").read())').pruebaAutorunDetected).toBe(true);
  });

  it("detects the generated safe main", () => {
    const analysis = analyzeMainContent(SAFE_MAIN_CONTENT);
    expect(analysis.isSafe).toBe(true);
    expect(analysis.autorunDetected).toBe(false);
    expect(SAFE_MAIN_CONTENT).toContain(BOOT_SAFETY_MARKER);
  });

  it("chooses the default backup when it is available", () => {
    expect(selectBackupPath([])).toBe("/main_autorun_backup.py");
  });

  it("chooses the first numbered backup when the default exists", () => {
    expect(selectBackupPath(["/main_autorun_backup.py"])).toBe(
      "/main_autorun_backup_1.py",
    );
  });

  it("parses successful sentinel output and a bounded preview", () => {
    const report = parseBootSafetyOutput(`OKBOOT_SAFETY:STATUS=OK
BOOT_SAFETY:MAIN_EXISTS=1
BOOT_SAFETY:MAIN_IS_SAFE=0
BOOT_SAFETY:BACKUPS=/main_autorun_backup.py,/main_autorun_backup_1.py
BOOT_SAFETY:MAIN_PREVIEW_BEGIN
${DISCOVERED_MAIN}
BOOT_SAFETY:MAIN_PREVIEW_END
BOOT_SAFETY:MESSAGE=Boot files inspected`);
    expect(report.status).toBe("OK");
    expect(report.mainExists).toBe(true);
    expect(report.backups).toHaveLength(2);
    expect(report.mainPreview).toContain("/prueba.py");
    expect(report.mainPreview.length).toBeLessThanOrEqual(2000);
  });

  it("parses error sentinel output", () => {
    const report = parseBootSafetyOutput(`BOOT_SAFETY:STATUS=ERROR
BOOT_SAFETY:MESSAGE=permission denied`);
    expect(report.status).toBe("ERROR");
    expect(report.message).toBe("permission denied");
  });
});

