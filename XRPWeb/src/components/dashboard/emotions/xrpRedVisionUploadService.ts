import AppMgr from "@/managers/appmgr";

import {
  ConnectionType,
} from "@/utils/types";

import type {
  CustomEmotionRecord,
} from "./customEmotionTypes";

import {
  createRedVisionSheetFromCustomEmotion,
} from "./redVisionSheetProcessor";

import {
  buildDeleteCustomEmotionScript,
} from "./redVisionCustomEmotionDelete";

type WebSerialPort = {
  open: (
    options: {
      baudRate: number;
    }
  ) => Promise<void>;

  close: () => Promise<void>;

  readable:
    | ReadableStream<Uint8Array>
    | null;

  writable:
    | WritableStream<Uint8Array>
    | null;
};

type NavigatorWithSerial =
  Navigator & {
    serial?: {
      requestPort: () => Promise<WebSerialPort>;
    };
  };

export interface XrpRedVisionUploadProgress {
  stage:
    | "connecting"
    | "preparing"
    | "uploading"
    | "finalizing"
    | "done";

  message: string;
  sentBytes: number;
  totalBytes: number;
}

export interface UploadCustomEmotionToRedVisionOptions {
  baudRate?: number;
  chunkSizeBytes?: number;

  /*
   * Zero-based dashboard frame index.
   * Example: frameIndex 4 uploads frame 5.
   */
  frameIndex?: number;

  onProgress?: (
    progress: XrpRedVisionUploadProgress
  ) => void;
}

export interface DeleteCustomEmotionFromRedVisionOptions {
  baudRate?: number;
  onProgress?: (message: string) => void;
}

const DEFAULT_BAUD_RATE = 115200;

/*
 * Small chunks are slower, but much safer for
 * the MicroPython interactive REPL. We can
 * optimize this later with raw-paste mode.
 */
const DEFAULT_CHUNK_SIZE_BYTES = 96;

const CUSTOM_SHEETS_DIRECTORY =
  "/emotion_sheets_custom";

const CUSTOM_MANIFEST_PATH =
  CUSTOM_SHEETS_DIRECTORY +
  "/manifest.json";

let commandSequenceNumber = 0;

function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

export async function releaseExistingUsbConnectionForRedVisionUpload(): Promise<boolean> {
  try {
    const appMgr =
      AppMgr.getInstance();

    if (
      appMgr.getConnectionType() !==
      ConnectionType.USB
    ) {
      return false;
    }

    const connection =
      appMgr.getConnection();

    if (
      connection &&
      connection.isConnected()
    ) {
      await connection.disconnect();

      /*
       * Give Web Serial a short moment to release
       * the reader/writer locks and close the port.
       */
      await sleep(700);

      return true;
    }
  } catch (error) {
    console.warn(
      "Could not release existing XRP USB connection:",
      error
    );
  }

  return false;
}

function pythonStringLiteral(
  value: string
): string {
  /*
   * JSON string syntax is also valid Python
   * string syntax for the values we send.
   */
  return JSON.stringify(value);
}

function bytesToBase64(
  bytes: Uint8Array
): string {
  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary += String.fromCharCode(
      bytes[index]
    );
  }

  return window.btoa(binary);
}

function safeRedVisionFps(
  value: number
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 4;
  }

  /*
   * The physical Red Vision display is slower
   * than the dashboard. Keep custom uploads
   * conservative.
   */
  return Math.min(
    Math.max(
      Math.round(value),
      1
    ),
    5
  );
}

function validateWebSerialAvailable(): void {
  const navigatorWithSerial =
    navigator as NavigatorWithSerial;

  if (!navigatorWithSerial.serial) {
    throw new Error(
      "Web Serial is not available. " +
        "Use Chrome or Edge on localhost/HTTPS."
    );
  }
}

async function openSelectedXrpSerialPort(
  baudRate: number
): Promise<WebSerialPort> {
  const navigatorWithSerial =
    navigator as NavigatorWithSerial;

  const port =
    await navigatorWithSerial.serial!.requestPort();

  try {
    await port.open({ baudRate });
  } catch (error) {
    const errorName =
      error instanceof DOMException
        ? error.name
        : "";

    if (errorName === "InvalidStateError") {
      throw new Error(
        "The XRP USB port is already open. " +
          "Click Disconnect XRP USB, close other serial tools " +
          "such as mpremote or Thonny, and try again."
      );
    }

    throw error;
  }

  if (!port.readable || !port.writable) {
    await port.close();
    throw new Error(
      "The selected serial port is not readable/writable."
    );
  }

  return port;
}

async function readUntilPrompt(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 6000
): Promise<string> {
  const decoder =
    new TextDecoder();

  let output = "";
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    timeoutMs
  ) {
    const remaining =
      timeoutMs -
      (Date.now() - startedAt);

    const result =
      await Promise.race([
        reader.read(),
        sleep(
          Math.min(
            250,
            Math.max(
              remaining,
              1
            )
          )
        ).then(
          () => "timeout" as const
        ),
      ]);

    if (result === "timeout") {
      if (output.includes(">>>")) {
        return output;
      }

      continue;
    }

    if (result.done) {
      return output;
    }

    output += decoder.decode(
      result.value,
      {
        stream: true,
      }
    );

    if (output.includes(">>>")) {
      return output;
    }
  }

  throw new Error(
    "Timed out waiting for the XRP MicroPython prompt. " +
      "Stop the running program or disconnect other serial connections."
  );
}

async function readUntilText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  targetText: string,
  timeoutMs = 6000
): Promise<string> {
  const decoder =
    new TextDecoder();

  let output = "";
  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    timeoutMs
  ) {
    const remaining =
      timeoutMs -
      (Date.now() - startedAt);

    const result =
      await Promise.race([
        reader.read(),
        sleep(
          Math.min(
            250,
            Math.max(
              remaining,
              1
            )
          )
        ).then(
          () => "timeout" as const
        ),
      ]);

    if (result === "timeout") {
      if (
        output.includes(
          targetText
        )
      ) {
        return output;
      }

      continue;
    }

    if (result.done) {
      return output;
    }

    output += decoder.decode(
      result.value,
      {
        stream: true,
      }
    );

    if (
      output.includes(
        targetText
      )
    ) {
      return output;
    }
  }

  throw new Error(
    "Timed out waiting for XRP response: " +
      targetText
  );
}

async function sendCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  command: string,
  timeoutMs = 6000
): Promise<string> {
  const encoder =
    new TextEncoder();

  commandSequenceNumber += 1;

  const marker =
    `__XRP_CMD_DONE_${commandSequenceNumber}__`;

  /*
   * Use a marker so a stale REPL prompt cannot be
   * mistaken for the end of the command. This makes
   * the final UPLOAD_OK confirmation reliable.
   */
  const wrappedCommand =
    "exec(" +
    pythonStringLiteral(
      command +
        "\nprint(" +
        pythonStringLiteral(marker) +
        ")"
    ) +
    ")";

  await writer.write(
    encoder.encode(
      wrappedCommand + "\r\n"
    )
  );

  const output =
    await readUntilText(
      reader,
      marker,
      timeoutMs
    );

  if (
    output.includes(
      "Traceback (most recent call last)"
    )
  ) {
    throw new Error(
      "The XRP returned a MicroPython error while uploading:\n" +
        output.slice(-1600)
    );
  }

  return output;
}

async function enterMicroPythonPrompt(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<void> {
  const encoder =
    new TextEncoder();

  /*
   * Ctrl-C twice stops a running program.
   * Ctrl-B returns from raw REPL to normal REPL
   * in case the board was left in raw mode.
   */
  await writer.write(
    encoder.encode(
      "\x03\x03\x02\r\n"
    )
  );

  await sleep(600);

  await writer.write(
    encoder.encode("\r\n")
  );

  await readUntilPrompt(
    reader,
    8000
  );
}

function makeSetupScript(
  temporaryPath: string
): string {
  return [
    "import os, ujson, ubinascii",
    `directory = ${pythonStringLiteral(CUSTOM_SHEETS_DIRECTORY)}`,
    "try:",
    " os.mkdir(directory)",
    "except OSError:",
    " pass",
    `temporary_path = ${pythonStringLiteral(temporaryPath)}`,
    "try:",
    " os.remove(temporary_path)",
    "except OSError:",
    " pass",
    "upload_file = open(temporary_path, 'wb')",
  ].join("\n");
}

function makeRenameScript(
  finalPath: string,
  temporaryPath: string
): string {
  return [
    `final_path = ${pythonStringLiteral(finalPath)}`,
    `temporary_path = ${pythonStringLiteral(temporaryPath)}`,
    "try:",
    " os.remove(final_path)",
    "except OSError:",
    " pass",
    "os.rename(temporary_path, final_path)",
  ].join("\n");
}

function makeManifestReadScript(): string {
  return [
    `manifest_path = ${pythonStringLiteral(CUSTOM_MANIFEST_PATH)}`,
    "try:",
    " manifest_file = open(manifest_path, 'r')",
    " manifest = ujson.loads(manifest_file.read())",
    " manifest_file.close()",
    "except Exception:",
    " manifest = {}",
  ].join("\n");
}

function makeManifestEntryCommand(
  emotionName: string,
  frameCount: number,
  defaultFps: number,
  repeatMode: string
): string {
  return (
    `manifest[${pythonStringLiteral(emotionName)}] = ` +
    JSON.stringify({
      frame_count: frameCount,
      default_fps: defaultFps,
      repeat_mode: repeatMode,
    })
  );
}

function makeManifestWriteCommand(
  emotionName: string
): string {
  return [
    "manifest_file = open(manifest_path, 'w')",
    "manifest_file.write(ujson.dumps(manifest))",
    "manifest_file.close()",
    "print(" +
      pythonStringLiteral(
        `UPLOAD_OK ${emotionName}`
      ) +
      ")",
  ].join("; ");
}

export async function deleteCustomEmotionFromRedVision(
  emotionName: string,
  options: DeleteCustomEmotionFromRedVisionOptions = {}
): Promise<void> {
  validateWebSerialAvailable();
  const baudRate = options.baudRate ?? DEFAULT_BAUD_RATE;
  const report = (message: string): void => {
    options.onProgress?.(message);
  };

  const deleteScript =
    buildDeleteCustomEmotionScript(emotionName);

  report("Releasing existing XRP USB connection...");
  await releaseExistingUsbConnectionForRedVisionUpload();

  report("Select the XRP USB serial port to delete the emotion...");
  const port = await openSelectedXrpSerialPort(baudRate);
  const reader = port.readable!.getReader();
  const writer = port.writable!.getWriter();

  try {
    report("Entering the XRP MicroPython prompt...");
    await enterMicroPythonPrompt(writer, reader);

    report("Removing the custom emotion from XRP Red Vision...");
    const output = await sendCommand(
      writer,
      reader,
      deleteScript,
      15000
    );

    if (!output.includes(`DELETE_OK ${emotionName}`)) {
      throw new Error(
        "The XRP did not confirm that the custom emotion was deleted."
      );
    }

    report("Removed from XRP Red Vision.");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* Ignore cleanup errors. */
    }

    try {
      writer.releaseLock();
    } catch {
      /* Ignore cleanup errors. */
    }

    await port.close();
  }
}

export async function uploadCustomEmotionToRedVision(
  emotion: CustomEmotionRecord,
  options: UploadCustomEmotionToRedVisionOptions = {}
): Promise<void> {
  validateWebSerialAvailable();

  const baudRate =
    options.baudRate ??
    DEFAULT_BAUD_RATE;

  const chunkSizeBytes =
    options.chunkSizeBytes ??
    DEFAULT_CHUNK_SIZE_BYTES;

  const report = (
    progress: XrpRedVisionUploadProgress
  ) => {
    options.onProgress?.(
      progress
    );
  };

  report({
    stage: "preparing",
    message: "Preparing Red Vision sheet...",
    sentBytes: 0,
    totalBytes: 0,
  });

  const redVisionSheet =
    await createRedVisionSheetFromCustomEmotion(
      emotion,
      {
        frameIndex:
          options.frameIndex,
      }
    );

  const arrayBuffer =
    await redVisionSheet.sheetBlob.arrayBuffer();

  const bytes =
    new Uint8Array(
      arrayBuffer
    );

  const totalBytes =
    bytes.length;

  const emotionName =
    redVisionSheet.emotionName;

  const finalPath =
    `${CUSTOM_SHEETS_DIRECTORY}/${emotionName}.png`;

  const temporaryPath =
    `${finalPath}.tmp`;

  const defaultFps =
    safeRedVisionFps(
      redVisionSheet.defaultFps
    );

  report({
    stage: "connecting",
    message:
      `Preparing frame ${redVisionSheet.selectedFrameIndex + 1} ` +
      `of ${emotion.frameCount} for Red Vision...`,
    sentBytes: 0,
    totalBytes,
  });

  report({
    stage: "connecting",
    message: "Releasing existing XRP USB connection...",
    sentBytes: 0,
    totalBytes,
  });

  await releaseExistingUsbConnectionForRedVisionUpload();

  report({
    stage: "connecting",
    message: "Select the XRP USB serial port...",
    sentBytes: 0,
    totalBytes,
  });

  const port =
    await openSelectedXrpSerialPort(baudRate);

  const reader =
    port.readable!.getReader();

  const writer =
    port.writable!.getWriter();

  try {
    report({
      stage: "connecting",
      message: "Entering MicroPython prompt...",
      sentBytes: 0,
      totalBytes,
    });

    await enterMicroPythonPrompt(
      writer,
      reader
    );

    report({
      stage: "preparing",
      message: "Creating XRP destination file...",
      sentBytes: 0,
      totalBytes,
    });

    await sendCommand(
      writer,
      reader,
      "exec(" +
        pythonStringLiteral(
          makeSetupScript(
            temporaryPath
          )
        ) +
        ")",
      10000
    );

    let sentBytes = 0;

    for (
      let offset = 0;
      offset < bytes.length;
      offset += chunkSizeBytes
    ) {
      const chunk = bytes.slice(
        offset,
        Math.min(
          offset + chunkSizeBytes,
          bytes.length
        )
      );

      const base64Chunk =
        bytesToBase64(
          chunk
        );

      await sendCommand(
        writer,
        reader,
        "_ = upload_file.write(ubinascii.a2b_base64(" +
          pythonStringLiteral(
            base64Chunk
          ) +
          "))",
        8000
      );

      sentBytes += chunk.length;

      report({
        stage: "uploading",
        message:
          `Uploading ${Math.round(
            (
              sentBytes /
              totalBytes
            ) * 100
          )}%...`,
        sentBytes,
        totalBytes,
      });
    }

    report({
      stage: "finalizing",
      message: "Saving manifest on XRP...",
      sentBytes: totalBytes,
      totalBytes,
    });

    await sendCommand(
      writer,
      reader,
      "upload_file.close()",
      8000
    );

    await sendCommand(
      writer,
      reader,
      "import os, ujson",
      8000
    );

    await sendCommand(
      writer,
      reader,
      "exec(" +
        pythonStringLiteral(
          makeRenameScript(
            finalPath,
            temporaryPath
          )
        ) +
        ")",
      10000
    );

    await sendCommand(
      writer,
      reader,
      "exec(" +
        pythonStringLiteral(
          makeManifestReadScript()
        ) +
        ")",
      10000
    );

    await sendCommand(
      writer,
      reader,
      makeManifestEntryCommand(
        emotionName,
        redVisionSheet.frameCount,
        defaultFps,
        redVisionSheet.repeatMode
      ),
      8000
    );

    const output =
      await sendCommand(
        writer,
        reader,
        makeManifestWriteCommand(
          emotionName
        ),
        20000
      );

    if (
      !output.includes("UPLOAD_OK")
    ) {
      throw new Error(
        "Upload finished, but the XRP did not confirm UPLOAD_OK. " +
          "Check /emotion_sheets_custom for a .png.tmp file, " +
          "then run finish_redvision_upload.py if needed."
      );
    }

    report({
      stage: "done",
      message:
        `Uploaded ${emotionName} frame ` +
        `${redVisionSheet.selectedFrameIndex + 1} ` +
        `to XRP Red Vision.`,
      sentBytes: totalBytes,
      totalBytes,
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* Ignore cleanup errors. */
    }

    try {
      writer.releaseLock();
    } catch {
      /* Ignore cleanup errors. */
    }

    await port.close();
  }
}
