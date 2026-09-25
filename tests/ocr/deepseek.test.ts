import { afterEach, describe, expect, it } from "vitest";
import {
  DEEPSEEK_MODEL,
  DeepSeekError,
  extractText,
  isDeepSeekConfigured,
  normalizeImageDataUrl,
  OCR_PROMPT,
  parseDataUrl,
} from "../../src/lib/ocr/deepseek";

const ORIGINAL_API_KEY = process.env.DEEPSEEK_API_KEY;

afterEach(() => {
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.DEEPSEEK_API_KEY;
  } else {
    process.env.DEEPSEEK_API_KEY = ORIGINAL_API_KEY;
  }
});

describe("parseDataUrl", () => {
  it("parses a valid base64 data URL", () => {
    expect(parseDataUrl("data:image/png;base64,QUJD")).toEqual({
      mimeType: "image/png",
      base64: "QUJD",
    });
  });

  it("rejects non-string input", () => {
    expect(() => parseDataUrl(123 as unknown)).toThrow("缺少图片数据");
  });

  it("rejects input that is not a data URL", () => {
    expect(() => parseDataUrl("hello world")).toThrow("格式不正确");
  });

  it("rejects a non-base64 data URL", () => {
    expect(() => parseDataUrl("data:image/png;inline,QUJD")).toThrow(
      "格式不正确",
    );
  });
});

describe("normalizeImageDataUrl", () => {
  it("accepts a PNG data URL and returns a normalized URL", () => {
    expect(normalizeImageDataUrl("data:image/png;base64,QUJD")).toBe(
      "data:image/png;base64,QUJD",
    );
  });

  it("accepts JPEG and WebP", () => {
    expect(normalizeImageDataUrl("data:image/jpeg;base64,QQ==")).toContain(
      "image/jpeg",
    );
    expect(normalizeImageDataUrl("data:image/webp;base64,QQ==")).toContain(
      "image/webp",
    );
  });

  it("lowercases an uppercase mime type", () => {
    expect(normalizeImageDataUrl("data:image/PNG;base64,QUJD")).toBe(
      "data:image/png;base64,QUJD",
    );
  });

  it("rejects an unsupported image type", () => {
    expect(() =>
      normalizeImageDataUrl("data:image/gif;base64,QUJD"),
    ).toThrow("不支持的图片格式");
  });

  it("rejects an empty image payload", () => {
    expect(() => normalizeImageDataUrl("data:image/png;base64,")).toThrow(
      "为空",
    );
  });

  it("rejects an image larger than 10MB", () => {
    // 1400 万个字符的 base64，解码后约 10.5MB，超过 10MB 上限。
    const oversized = `data:image/png;base64,${"A".repeat(14_000_000)}`;

    expect(() => normalizeImageDataUrl(oversized)).toThrow("超过 10MB");
  });
});

describe("extractText", () => {
  it("extracts the message content from a valid response", () => {
    expect(
      extractText({
        choices: [{ message: { content: "识别到的文字" } }],
      }),
    ).toBe("识别到的文字");
  });

  it("throws for non-object payloads", () => {
    expect(() => extractText(null)).toThrow("无法解析");
    expect(() => extractText("text")).toThrow("无法解析");
  });

  it("throws when choices is missing", () => {
    expect(() => extractText({})).toThrow("未返回识别结果");
  });

  it("throws when choices is empty", () => {
    expect(() => extractText({ choices: [] })).toThrow("未返回识别结果");
  });

  it("throws when content is not a string", () => {
    expect(() =>
      extractText({ choices: [{ message: { content: 123 } }] }),
    ).toThrow("返回内容为空");
  });
});

describe("isDeepSeekConfigured", () => {
  it("returns false when the key is unset", () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(isDeepSeekConfigured()).toBe(false);
  });

  it("returns false when the key is blank", () => {
    process.env.DEEPSEEK_API_KEY = "   ";
    expect(isDeepSeekConfigured()).toBe(false);
  });

  it("returns true when the key is set", () => {
    process.env.DEEPSEEK_API_KEY = "sk-test";
    expect(isDeepSeekConfigured()).toBe(true);
  });
});

describe("DeepSeek constants", () => {
  it("uses the official vision-capable model id", () => {
    expect(DEEPSEEK_MODEL).toBe("deepseek-flash");
  });

  it("instructs the model to only return text", () => {
    expect(OCR_PROMPT).toContain("只返回识别到的文字");
    expect(OCR_PROMPT).toContain("[无法识别]");
  });

  it("exposes a status-carrying error type", () => {
    const error = new DeepSeekError("测试", 502, "CODE");

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(502);
    expect(error.code).toBe("CODE");
  });
});
