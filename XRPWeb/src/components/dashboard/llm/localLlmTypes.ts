import type { LocalSemanticAnalysis } from "../conversation/studentCompanionTypes";

export const DEFAULT_LOCAL_LLM_MODEL_ID =
  "onnx-community/Qwen2.5-0.5B-Instruct";


export type LocalLlmEmotionKey =
  | "idle"
  | "happy"
  | "sad"
  | "upset"
  | "excited"
  | "in_love";


export type LocalLlmChatResponse = {
  reply: string;
  emotionKey: LocalLlmEmotionKey;
  confidence: number;
  reason: string;
  requestId?: string;
};

export type LocalLlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalLlmTask = "conversation" | "semantic_analysis";

export type LocalLlmSemanticResponse = LocalSemanticAnalysis & {
  requestId?: string;
};


export type LocalLlmWorkerRequest =
  | {
      type: "load";
      modelId: string;
    }
  | {
      type: "generate";
      requestId: string;
      task: LocalLlmTask;
      messages: LocalLlmMessage[];
    }
  | {
      type: "unload";
    };


export type LocalLlmWorkerResponse =
  | {
      type: "progress";
      progress: number;
      status: string;
    }
  | {
      type: "ready";
      modelId: string;
      device: string;
    }
  | {
      type: "result";
      requestId: string;
      task: LocalLlmTask;
      generatedText: string;
    }
  | {
      type: "error";
      requestId?: string;
      message: string;
    }
  | {
      type: "unloaded";
    };


export type LocalLlmPhase =
  | "not_loaded"
  | "checking_support"
  | "downloading"
  | "loading"
  | "ready"
  | "generating"
  | "unsupported"
  | "error";


export type LocalLlmRuntimeState = {
  phase: LocalLlmPhase;
  modelId: string;
  progress: number;
  status: string;
  device: string;
  error: string;
};


export function initialLocalLlmRuntimeState(
  modelId = DEFAULT_LOCAL_LLM_MODEL_ID
): LocalLlmRuntimeState {
  return {
    phase: "not_loaded",
    modelId,
    progress: 0,
    status: "Not loaded",
    device: "",
    error: "",
  };
}
