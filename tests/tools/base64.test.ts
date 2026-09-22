import { describe, expect, it } from "vitest";
import { runBase64Transform } from "../../src/lib/tools/base64";
import { MAX_INPUT_LENGTH } from "../../src/lib/tools/limits";

describe("runBase64Transform", () => {
  it("encodes Chinese text", () => {
    expect(runBase64Transform("你好")).toBe("5L2g5aW9");
  });

  it("encodes emoji without splitting the surrogate pair", () => {
    expect(runBase64Transform("😀👍")).toBe("8J+YgPCfkY0=");
  });

  it("decodes Chinese Base64", () => {
    expect(runBase64Transform("5L2g5aW9")).toBe("你好");
  });

  it("encodes and decodes Japanese text", () => {
    const encoded = runBase64Transform("こんにちは");

    expect(encoded).toBe("44GT44KT44Gr44Gh44Gv");
    expect(runBase64Transform(encoded)).toBe("こんにちは");
  });

  it("supports mixed Chinese, English, punctuation, and emoji", () => {
    const input = "你好 StudentTool 😀！";
    const encoded = runBase64Transform(input);

    expect(runBase64Transform(encoded)).toBe(input);
  });

  it("rejects empty input", () => {
    expect(() => runBase64Transform("")).toThrow("空输入");
  });

  it("rejects whitespace-only input", () => {
    expect(() => runBase64Transform(" \n\t ")).toThrow("空输入");
  });

  it("reports Base64 that is not valid UTF-8", () => {
    expect(() => runBase64Transform("////")).toThrow("不是有效 UTF-8");
  });

  it("reports malformed Base64 input", () => {
    expect(() => runBase64Transform("SGVsbG8$")).toThrow("格式不合法");
  });

  it("decodes URL-safe Base64", () => {
    expect(runBase64Transform("SGVsbG8td29ybGQ")).toBe("Hello-world");
  });

  it("decodes unpadded URL-safe Base64 without a URL-only marker", () => {
    expect(runBase64Transform("SGVsbG8")).toBe("Hello");
  });

  it("round-trips ASCII, Unicode, and line breaks", () => {
    const input = "Hello, 世界!\n第二行 😀";

    expect(runBase64Transform(runBase64Transform(input))).toBe(input);
  });

  it("encodes ordinary ASCII text that is not Base64", () => {
    expect(runBase64Transform("Hello")).toBe("SGVsbG8=");
  });

  it("accepts Base64 with surrounding line breaks", () => {
    expect(runBase64Transform("5L2g\n5aW9")).toBe("你好");
  });

  it("rejects oversized input", () => {
    expect(() => runBase64Transform("a".repeat(MAX_INPUT_LENGTH + 1))).toThrow(
      "输入内容过长",
    );
  });
});
