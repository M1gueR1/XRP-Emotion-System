import type { LocalLlmMessage } from "./localLlmTypes";

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((item) => {
    if (item && typeof item === "object" && "text" in item && typeof (item as { text?: unknown }).text === "string") {
      return (item as { text: string }).text;
    }
    return "";
  }).join(" ").trim();
}

/** Extracts only newly generated assistant content from Transformers.js output. */
export function extractFinalAssistantOutput(
  output: unknown,
  requestMessages: LocalLlmMessage[]
): string {
  const first = Array.isArray(output) ? output[0] : undefined;
  const generated = first && typeof first === "object" && "generated_text" in first
    ? (first as { generated_text?: unknown }).generated_text
    : undefined;

  if (Array.isArray(generated)) {
    let finalUserIndex = -1;
    generated.forEach((message, index) => {
      if (message && typeof message === "object" && (message as { role?: unknown }).role === "user") {
        finalUserIndex = index;
      }
    });
    for (let index = generated.length - 1; index > finalUserIndex; index -= 1) {
      const message = generated[index];
      if (message && typeof message === "object" && (message as { role?: unknown }).role === "assistant") {
        const text = contentText((message as { content?: unknown }).content);
        if (text) return text;
      }
    }
    return "";
  }

  if (typeof generated === "string") {
    const serializedPrompt = requestMessages.map((message) => message.content).join("\n");
    return generated.startsWith(serializedPrompt)
      ? generated.slice(serializedPrompt.length).trim()
      : generated.trim();
  }
  return "";
}
