import { describe, expect, it } from "vitest";
import type { CliBackendConfig } from "../../config/types.js";
import { parseCliJson, parseCliJsonl } from "./helpers.js";

const EMPTY_BACKEND: CliBackendConfig = { command: "test" };
const CODEX_BACKEND: CliBackendConfig = {
  command: "codex",
  output: "jsonl",
  sessionIdFields: ["thread_id"],
};

describe("parseCliJson", () => {
  it("extracts text from message field", () => {
    const raw = JSON.stringify({ message: { content: "hello" } });
    const result = parseCliJson(raw, EMPTY_BACKEND);
    expect(result?.text).toBe("hello");
  });

  it("returns null for empty input", () => {
    expect(parseCliJson("", EMPTY_BACKEND)).toBeNull();
    expect(parseCliJson("   ", EMPTY_BACKEND)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseCliJson("not json", EMPTY_BACKEND)).toBeNull();
  });

  it("extracts session ID from configured fields", () => {
    const raw = JSON.stringify({ message: "hi", session_id: "sess-1" });
    const result = parseCliJson(raw, EMPTY_BACKEND);
    expect(result?.sessionId).toBe("sess-1");
  });

  it("extracts usage data", () => {
    const raw = JSON.stringify({
      message: "hi",
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    const result = parseCliJson(raw, EMPTY_BACKEND);
    expect(result?.usage?.input).toBe(100);
    expect(result?.usage?.output).toBe(50);
  });
});

describe("parseCliJsonl", () => {
  it("extracts text from message-type items", () => {
    const lines = [JSON.stringify({ item: { type: "agent_message", text: "Hello world" } })].join(
      "\n",
    );
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("Hello world");
  });

  it("extracts text from items with no type (treated as message)", () => {
    const lines = [JSON.stringify({ item: { text: "No type item" } })].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("No type item");
  });

  it("falls back to reasoning/other item types when no message items exist", () => {
    const lines = [
      JSON.stringify({ item: { type: "reasoning", text: "I think the answer is 42." } }),
      JSON.stringify({ item: { type: "command_execution", text: "ls -la" } }),
    ].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("I think the answer is 42.\nls -la");
  });

  it("prefers message items over fallback items", () => {
    const lines = [
      JSON.stringify({ item: { type: "reasoning", text: "thinking..." } }),
      JSON.stringify({ item: { type: "agent_message", text: "The answer is 42." } }),
    ].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("The answer is 42.");
  });

  it("extracts thread_id as session ID", () => {
    const lines = [
      JSON.stringify({ thread_id: "thread-abc", item: { type: "agent_message", text: "hi" } }),
    ].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.sessionId).toBe("thread-abc");
  });

  it("extracts usage from JSONL lines", () => {
    const lines = [
      JSON.stringify({ item: { type: "agent_message", text: "hi" } }),
      JSON.stringify({ usage: { input_tokens: 200, output_tokens: 100 } }),
    ].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.usage?.input).toBe(200);
    expect(result?.usage?.output).toBe(100);
  });

  it("returns null for empty input", () => {
    expect(parseCliJsonl("", CODEX_BACKEND)).toBeNull();
    expect(parseCliJsonl("   \n  ", CODEX_BACKEND)).toBeNull();
  });

  it("returns null when no text found at all", () => {
    const lines = [JSON.stringify({ thread_id: "abc" })].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result).toBeNull();
  });

  it("falls back to top-level text/content for non-item JSONL", () => {
    const lines = [JSON.stringify({ content: "top-level content" })].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("top-level content");
  });

  it("combines multiple message items", () => {
    const lines = [
      JSON.stringify({ item: { type: "message", text: "Part 1." } }),
      JSON.stringify({ item: { type: "message", text: "Part 2." } }),
    ].join("\n");
    const result = parseCliJsonl(lines, CODEX_BACKEND);
    expect(result?.text).toBe("Part 1.\nPart 2.");
  });
});
