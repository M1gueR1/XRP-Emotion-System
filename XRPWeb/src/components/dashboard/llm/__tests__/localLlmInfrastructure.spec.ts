import { describe, expect, it } from "vitest";
import { LocalLlmChatAdapter, createLocalLlmRequestSnapshot } from "../localLlmChatAdapter";
import { extractFinalAssistantOutput } from "../localLlmOutput";
import { parseLocalLlmOutput } from "../localLlmParser";
import { buildLocalLlmMessages } from "../localLlmPrompt";
import type { LocalLlmMessage, LocalLlmWorkerResponse } from "../localLlmTypes";

class MockWorker {
  sent: unknown[] = [];
  messageListeners = new Set<EventListener>();
  errorListeners = new Set<EventListener>();
  postMessage(message: unknown) { this.sent.push(message); }
  addEventListener(type: string, listener: EventListener) {
    (type === "message" ? this.messageListeners : this.errorListeners).add(listener);
  }
  removeEventListener(type: string, listener: EventListener) {
    (type === "message" ? this.messageListeners : this.errorListeners).delete(listener);
  }
  terminate() {}
  emit(message: LocalLlmWorkerResponse) {
    this.messageListeners.forEach((listener) => listener({ data: message } as unknown as Event));
  }
}

const responseJson = (reply: string) => JSON.stringify({
  reply,
  emotionKey: "happy",
  confidence: 0.8,
  reason: "Current message response",
});

describe("Qwen request and response infrastructure", () => {
  it("creates immutable unique snapshots whose final input is the current student message", () => {
    const inputs = ["Hello", "How are you?", "My name is Miguel.", "I like dogs."];
    const snapshots = inputs.map((studentMessage) => createLocalLlmRequestSnapshot(
      "conversation",
      buildLocalLlmMessages({ robotName: "XRP Robot", memoryItems: [], recentMessages: [], studentMessage })
    ));
    expect(new Set(snapshots.map((snapshot) => snapshot.requestId)).size).toBe(4);
    snapshots.forEach((snapshot, index) => {
      expect(snapshot.messages.at(-1)).toEqual({ role: "user", content: inputs[index] });
    });
  });

  it("does not duplicate the current input in history", () => {
    const messages = buildLocalLlmMessages({
      robotName: "XRP Robot",
      memoryItems: [],
      recentMessages: [{ role: "robot", text: "Hi" }, { role: "user", text: "How are you?" }],
      studentMessage: "How are you?",
    });
    expect(messages.filter((message) => message.role === "user" && message.content === "How are you?")).toHaveLength(1);
    expect(messages.at(-1)?.role).toBe("user");
  });

  it("resolves out-of-order Worker responses to the matching request and installs one listener", async () => {
    const worker = new MockWorker();
    const adapter = new LocalLlmChatAdapter(() => worker as never);
    const loading = adapter.load();
    worker.emit({ type: "ready", modelId: "test", device: "webgpu" });
    await loading;

    const first = adapter.generate([{ role: "user", content: "Hello" }]);
    const second = adapter.generate([{ role: "user", content: "How are you?" }]);
    const requests = worker.sent.filter((item) => (item as { type?: string }).type === "generate") as Array<{ requestId: string; task: "conversation"; messages: LocalLlmMessage[] }>;
    expect(requests[0].requestId).not.toBe(requests[1].requestId);
    expect(worker.messageListeners.size).toBe(1);

    worker.emit({ type: "result", requestId: requests[1].requestId, task: "conversation", generatedText: responseJson("I am doing well!") });
    worker.emit({ type: "result", requestId: requests[0].requestId, task: "conversation", generatedText: responseJson("Hello there!") });
    await expect(first).resolves.toMatchObject({ reply: "Hello there!", requestId: requests[0].requestId });
    await expect(second).resolves.toMatchObject({ reply: "I am doing well!", requestId: requests[1].requestId });
    adapter.dispose();
  });

  it("selects the final assistant output after the final user message", () => {
    const request: LocalLlmMessage[] = [{ role: "system", content: "Example assistant: stale" }, { role: "user", content: "How are you?" }];
    const output = [{ generated_text: [
      { role: "system", content: "Example assistant: stale" },
      { role: "assistant", content: "Prompt example" },
      { role: "user", content: "How are you?" },
      { role: "assistant", content: responseJson("Current answer") },
    ] }];
    expect(extractFinalAssistantOutput(output, request)).toContain("Current answer");
    expect(extractFinalAssistantOutput(output, request)).not.toContain("Prompt example");
  });

  it("accepts plain text from the downloaded local model", () => {
    expect(parseLocalLlmOutput("Hello there! Nice to meet you.")).toMatchObject({
      reply: "Hello there! Nice to meet you.",
      emotionKey: "happy",
    });
  });

  it("falls back to a safe supported emotion when local JSON uses an unsupported emotion", () => {
    expect(parseLocalLlmOutput(JSON.stringify({
      reply: "Hello! I am happy to chat with you.",
      emotionKey: "friendly",
      confidence: 0.7,
      reason: "Greeting",
    }))).toMatchObject({
      reply: "Hello! I am happy to chat with you.",
      emotionKey: "happy",
      confidence: 0.7,
    });
  });
});
