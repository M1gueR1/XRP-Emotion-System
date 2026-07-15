import { parseLocalLlmOutput } from "./localLlmParser";
import { parseLocalSemanticOutput } from "./localLlmSemantic";
import type {
  LocalLlmChatResponse,
  LocalLlmMessage,
  LocalLlmRuntimeState,
  LocalLlmSemanticResponse,
  LocalLlmTask,
  LocalLlmWorkerRequest,
  LocalLlmWorkerResponse,
} from "./localLlmTypes";
import { DEFAULT_LOCAL_LLM_MODEL_ID, initialLocalLlmRuntimeState } from "./localLlmTypes";

type StateListener = (state: LocalLlmRuntimeState) => void;
type WorkerPort = Pick<Worker, "postMessage" | "addEventListener" | "removeEventListener" | "terminate">;
type WorkerFactory = () => WorkerPort;

type PendingRequest = {
  task: LocalLlmTask;
  resolve: (generatedText: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type LocalLlmRequestSnapshot = Readonly<{
  type: "generate";
  requestId: string;
  task: LocalLlmTask;
  messages: ReadonlyArray<Readonly<LocalLlmMessage>>;
}>;

export function createLocalLlmRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createLocalLlmRequestSnapshot(
  task: LocalLlmTask,
  messages: LocalLlmMessage[],
  id = createLocalLlmRequestId()
): LocalLlmRequestSnapshot {
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    throw new Error("A local-model request must end with the current student message.");
  }
  return Object.freeze({
    type: "generate" as const,
    requestId: id,
    task,
    messages: Object.freeze(messages.map((message) => Object.freeze({ ...message }))),
  });
}

const defaultWorkerFactory: WorkerFactory = () => new Worker(
  new URL("./localLlmWorker.ts", import.meta.url),
  { type: "module" }
);

export class LocalLlmChatAdapter {
  private worker: WorkerPort | null = null;
  private state = initialLocalLlmRuntimeState();
  private listeners = new Set<StateListener>();
  private pending = new Map<string, PendingRequest>();
  private pendingLoad: { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> } | null = null;

  constructor(private readonly workerFactory: WorkerFactory = defaultWorkerFactory) {}

  getState(): LocalLlmRuntimeState { return this.state; }
  getPendingRequestCount(): number { return this.pending.size; }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private updateState(patch: Partial<LocalLlmRuntimeState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private ensureWorker(): WorkerPort {
    if (this.worker) return this.worker;
    this.worker = this.workerFactory();
    // Exactly one listener of each type is installed per Worker instance.
    this.worker.addEventListener("message", this.handleMessage as EventListener);
    this.worker.addEventListener("error", this.handleWorkerError as EventListener);
    return this.worker;
  }

  private finishPending(id: string): PendingRequest | null {
    const pending = this.pending.get(id) ?? null;
    if (!pending) return null;
    clearTimeout(pending.timeout);
    this.pending.delete(id);
    return pending;
  }

  private handleMessage = (event: MessageEvent<LocalLlmWorkerResponse>): void => {
    const message = event.data;
    if (message.type === "progress") {
      const downloading = message.status === "Downloading model";
      this.updateState({ phase: message.status === "Generating locally" ? "generating" : downloading ? "downloading" : "loading", progress: message.progress, status: downloading ? `Downloading model: ${Math.round(message.progress)}%` : message.status, error: "" });
      return;
    }
    if (message.type === "ready") {
      this.updateState({ phase: "ready", modelId: message.modelId, progress: 100, status: "Ready on WebGPU", device: message.device, error: "" });
      if (this.pendingLoad) {
        clearTimeout(this.pendingLoad.timeout);
        this.pendingLoad.resolve();
        this.pendingLoad = null;
      }
      return;
    }
    if (message.type === "result") {
      const pending = this.finishPending(message.requestId);
      if (!pending || pending.task !== message.task) return; // unknown/duplicate/mismatched response
      pending.resolve(message.generatedText);
      if (this.pending.size === 0) this.updateState({ phase: "ready", status: "Ready on WebGPU", error: "" });
      return;
    }
    if (message.type === "unloaded") {
      this.updateState(initialLocalLlmRuntimeState(this.state.modelId));
      return;
    }
    const error = new Error(message.message);
    if (message.requestId) {
      const pending = this.finishPending(message.requestId);
      if (!pending) return;
      pending.reject(error);
    } else if (this.pendingLoad) {
      clearTimeout(this.pendingLoad.timeout);
      this.pendingLoad.reject(error);
      this.pendingLoad = null;
    }
    this.updateState({ phase: "error", status: "Local-model error", error: message.message });
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    const error = new Error(event.message || "The local-model worker failed.");
    if (this.pendingLoad) clearTimeout(this.pendingLoad.timeout);
    this.pendingLoad?.reject(error);
    this.pendingLoad = null;
    this.pending.forEach((request) => { clearTimeout(request.timeout); request.reject(error); });
    this.pending.clear();
    this.updateState({ phase: "error", status: "Local-model worker error", error: error.message });
  };

  async load(modelId = DEFAULT_LOCAL_LLM_MODEL_ID): Promise<void> {
    this.updateState({ phase: "checking_support", modelId, progress: 0, status: "Checking browser support", error: "" });
    if (typeof Worker === "undefined" && this.workerFactory === defaultWorkerFactory) throw new Error("Web Workers are unavailable in this browser.");
    if (typeof navigator !== "undefined" && !("gpu" in navigator) && this.workerFactory === defaultWorkerFactory) throw new Error("WebGPU unavailable. The local chat model was not loaded.");
    if (this.pendingLoad) throw new Error("The local chat model is already loading.");
    const worker = this.ensureWorker();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingLoad = null;
        reject(new Error("Loading the local model timed out."));
      }, 300_000);
      this.pendingLoad = { resolve, reject, timeout };
      worker.postMessage({ type: "load", modelId } satisfies LocalLlmWorkerRequest);
    });
  }

  private generateRaw(task: LocalLlmTask, messages: LocalLlmMessage[]): Promise<{ requestId: string; generatedText: string }> {
    if ((this.state.phase !== "ready" && this.state.phase !== "generating") || !this.worker) return Promise.reject(new Error("The local chat model is not ready."));
    const snapshot = createLocalLlmRequestSnapshot(task, messages);
    this.updateState({ phase: "generating", status: "Generating locally", error: "" });
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const pending = this.finishPending(snapshot.requestId);
        pending?.reject(new Error("The local-model request timed out."));
        if (this.pending.size === 0) this.updateState({ phase: "ready", status: "Ready on WebGPU" });
      }, 120_000);
      this.pending.set(snapshot.requestId, {
        task,
        timeout,
        resolve: (generatedText) => resolve({ requestId: snapshot.requestId, generatedText }),
        reject,
      });
      this.worker?.postMessage(snapshot as LocalLlmWorkerRequest);
    });
  }

  async generate(messages: LocalLlmMessage[]): Promise<LocalLlmChatResponse> {
    const result = await this.generateRaw("conversation", messages);
    return { ...parseLocalLlmOutput(result.generatedText), requestId: result.requestId };
  }

  async analyze(messages: LocalLlmMessage[]): Promise<LocalLlmSemanticResponse> {
    const result = await this.generateRaw("semantic_analysis", messages);
    return { ...parseLocalSemanticOutput(result.generatedText), requestId: result.requestId };
  }

  unload(): void {
    const error = new Error("The local model was unloaded.");
    this.pending.forEach((request) => { clearTimeout(request.timeout); request.reject(error); });
    this.pending.clear();
    if (!this.worker) { this.updateState(initialLocalLlmRuntimeState(this.state.modelId)); return; }
    this.worker.postMessage({ type: "unload" } satisfies LocalLlmWorkerRequest);
    this.updateState({ phase: "loading", status: "Unloading model", error: "" });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.removeEventListener("message", this.handleMessage as EventListener);
      this.worker.removeEventListener("error", this.handleWorkerError as EventListener);
      this.worker.terminate();
    }
    this.worker = null;
    const error = new Error("The local-model worker was closed.");
    if (this.pendingLoad) clearTimeout(this.pendingLoad.timeout);
    this.pendingLoad?.reject(error);
    this.pendingLoad = null;
    this.pending.forEach((request) => { clearTimeout(request.timeout); request.reject(error); });
    this.pending.clear();
  }
}
