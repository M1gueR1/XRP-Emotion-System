import { pipeline } from "@huggingface/transformers";

import { extractFinalAssistantOutput } from "./localLlmOutput";
import type {
  LocalLlmWorkerRequest,
  LocalLlmWorkerResponse,
} from "./localLlmTypes";


type WorkerScope = {
  postMessage: (message: LocalLlmWorkerResponse) => void;
  onmessage: ((event: MessageEvent<LocalLlmWorkerRequest>) => void) | null;
};


const workerScope = self as unknown as WorkerScope;


function post(message: LocalLlmWorkerResponse): void {
  workerScope.postMessage(message);
}


function progressValue(value: unknown): number {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const progress = (value as { progress?: unknown }).progress;
  return typeof progress === "number"
    ? Math.min(100, Math.max(0, progress))
    : 0;
}


function progressStatus(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "Loading model";
  }

  const status = (value as { status?: unknown }).status;
  return status === "progress" || status === "progress_total"
    ? "Downloading model"
    : "Loading model";
}


async function createGenerator(modelId: string) {
  return pipeline(
    "text-generation",
    modelId,
    {
      device: "webgpu",
      dtype: "q4",
      progress_callback: (progress: unknown) => {
        post({
          type: "progress",
          progress: progressValue(progress),
          status: progressStatus(progress),
        });
      },
    }
  );
}


type LocalTextGenerator = Awaited<ReturnType<typeof createGenerator>>;

let generator: LocalTextGenerator | null = null;
let loadedModelId = "";
let loadPromise: Promise<void> | null = null;
let generationQueue: Promise<void> = Promise.resolve();


async function loadModel(modelId: string): Promise<void> {
  if (generator && loadedModelId === modelId) {
    post({
      type: "ready",
      modelId,
      device: "webgpu",
    });
    return;
  }

  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    if (generator) {
      await generator.dispose();
      generator = null;
      loadedModelId = "";
    }

    post({
      type: "progress",
      progress: 0,
      status: "Loading model",
    });

    generator = await createGenerator(modelId);
    loadedModelId = modelId;

    post({
      type: "ready",
      modelId,
      device: "webgpu",
    });
  })();

  try {
    await loadPromise;
  } finally {
    loadPromise = null;
  }
}


async function generate(
  requestId: string,
  task: "conversation" | "semantic_analysis",
  messages: Extract<LocalLlmWorkerRequest, { type: "generate" }>["messages"]
): Promise<void> {
  if (!generator) {
    throw new Error("The local chat model is not loaded.");
  }

  post({
    type: "progress",
    progress: 100,
    status: "Generating locally",
  });

  const output = await generator(
    messages,
    {
      max_new_tokens: task === "semantic_analysis" ? 220 : 100,
      do_sample: false,
      return_full_text: false,
    }
  );

  const generatedText = extractFinalAssistantOutput(output, messages);

  if (!generatedText) {
    throw new Error("The local model returned no new assistant output.");
  }

  post({
    type: "result",
    requestId,
    task,
    generatedText,
  });
}


async function unload(): Promise<void> {
  await loadPromise;

  if (generator) {
    await generator.dispose();
  }

  generator = null;
  loadedModelId = "";

  post({ type: "unloaded" });
}


workerScope.onmessage = (
  event: MessageEvent<LocalLlmWorkerRequest>
): void => {
  const request = event.data;

  if (request.type === "load") {
    void loadModel(request.modelId).catch((error: unknown) => {
      post({
        type: "error",
        message: error instanceof Error
          ? error.message
          : "Unable to load the local chat model.",
      });
    });
    return;
  }

  if (request.type === "unload") {
    generationQueue = generationQueue
      .then(unload)
      .catch((error: unknown) => {
        post({
          type: "error",
          message: error instanceof Error
            ? error.message
            : "Unable to unload the local chat model.",
        });
      });
    return;
  }

  generationQueue = generationQueue
    .then(() => generate(request.requestId, request.task, request.messages))
    .catch((error: unknown) => {
      post({
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error
          ? error.message
          : "Local generation failed.",
      });
    });
};
