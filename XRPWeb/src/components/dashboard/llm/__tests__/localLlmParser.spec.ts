import { describe, expect, it } from "vitest";

import {
  LocalLlmParseError,
  parseLocalLlmOutput,
} from "../localLlmParser";


describe("parseLocalLlmOutput", () => {
  it("extracts and validates JSON surrounded by model text", () => {
    const result = parseLocalLlmOutput(
      'Here is the answer: {"reply":"I am here with you.","emotionKey":"sad","confidence":0.8,"reason":"The student sounds disappointed."} End.'
    );

    expect(result).toEqual({
      reply: "I am here with you.",
      emotionKey: "sad",
      confidence: 0.8,
      reason: "The student sounds disappointed.",
    });
  });

  it("rejects malformed output", () => {
    expect(() => parseLocalLlmOutput("not json at all"))
      .toThrow(LocalLlmParseError);
  });

  it("normalizes common model emotion aliases", () => {
    expect(parseLocalLlmOutput(
      '{"reply":"Hello there!","emotionKey":"neutral","confidence":"0.8","reason":"A greeting."}'
    )).toMatchObject({
      emotionKey: "idle",
      confidence: 0.8,
    });

    expect(parseLocalLlmOutput(
      '{"reply":"That sounds frustrating.","emotion":"angry","confidence":0.7,"reason":"The student sounds annoyed."}'
    )).toMatchObject({
      emotionKey: "upset",
    });
  });

  it("rejects unsupported emotions", () => {
    expect(() => parseLocalLlmOutput(
      '{"reply":"Hello","emotionKey":"dragon","confidence":0.8,"reason":"invalid emotion"}'
    )).toThrow("unsupported emotion");
  });

  it("clamps confidence and limits reply length", () => {
    const reply = "a".repeat(400);
    const result = parseLocalLlmOutput(
      JSON.stringify({
        reply,
        emotionKey: "idle",
        confidence: 4,
        reason: "A short reason",
      })
    );

    expect(result.confidence).toBe(1);
    expect(result.reply.length).toBeLessThanOrEqual(240);
    expect(result.reply.endsWith("…")).toBe(true);
  });
});
