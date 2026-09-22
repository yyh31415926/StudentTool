import { describe, expect, it } from "vitest";
import { runUrlCodec } from "../../src/lib/tools/url-encode";
import { getToolById } from "../../src/lib/tools/registry";

describe("runUrlCodec", () => {
  it("encodes Chinese text", () => {
    expect(runUrlCodec("你好")).toBe("%E4%BD%A0%E5%A5%BD");
  });

  it("decodes Chinese percent escapes", () => {
    expect(runUrlCodec("%E4%BD%A0%E5%A5%BD")).toBe("你好");
  });

  it("decodes lowercase percent escapes", () => {
    expect(runUrlCodec("%e4%bd%a0")).toBe("你");
  });

  it("round-trips emoji", () => {
    const input = "😀👍";
    expect(runUrlCodec(runUrlCodec(input))).toBe(input);
  });

  it("round-trips Japanese text", () => {
    const input = "こんにちは";
    expect(runUrlCodec(runUrlCodec(input))).toBe(input);
  });

  it("encodes special URL characters", () => {
    expect(runUrlCodec("a&b=c?d/e#f")).toBe(
      "a%26b%3Dc%3Fd%2Fe%23f",
    );
  });

  it("encodes spaces as percent escapes", () => {
    expect(runUrlCodec("a b")).toBe("a%20b");
  });

  it("keeps plus signs instead of converting them to spaces", () => {
    expect(runUrlCodec("a+b=%E4%BD%A0")).toBe("a+b=你");
  });

  it("encodes line breaks", () => {
    expect(runUrlCodec("第一行\n第二行")).toBe(
      "%E7%AC%AC%E4%B8%80%E8%A1%8C%0A%E7%AC%AC%E4%BA%8C%E8%A1%8C",
    );
  });

  it("encodes literal percent signs when no complete escape is present", () => {
    expect(runUrlCodec("100%")).toBe("100%25");
  });

  it("decodes escaped percent signs", () => {
    expect(runUrlCodec("%25")).toBe("%");
  });

  it("round-trips mixed Chinese and English", () => {
    const input = "StudentTool 搜索 q=你好&emoji=😀";
    expect(runUrlCodec(runUrlCodec(input))).toBe(input);
  });

  it("handles large text", () => {
    const input = "你好 StudentTool 😀\n".repeat(1000);
    expect(runUrlCodec(runUrlCodec(input))).toBe(input);
  });

  it("rejects non-string input", () => {
    expect(() => runUrlCodec(123)).toThrow(TypeError);
  });

  it("reports invalid percent escapes with character position", () => {
    expect(() => runUrlCodec("%E4%B8%AD%")).toThrow(
      "第 10 个字符是非法百分号，% 后应该是两位十六进制。",
    );
  });

  it("reports truncated UTF-8 escapes", () => {
    expect(() => runUrlCodec("%E4%B8")).toThrow(
      "百分号转义无法还原成文字，请检查内容是否完整。",
    );
  });

  it("reports non-UTF-8 escapes", () => {
    expect(() => runUrlCodec("%FF")).toThrow(
      "百分号转义无法还原成文字，请检查内容是否完整。",
    );
  });

  it("reports lone Unicode surrogates", () => {
    expect(() => runUrlCodec("\uD800")).toThrow(
      "输入包含不完整字符，请重新复制完整内容。",
    );
  });
});

describe("url-encode tool definition", () => {
  it("is registered with the text-transform template and a run function", () => {
    const tool = getToolById("url-encode");

    expect(tool).toMatchObject({
      id: "url-encode",
      name: "URL 编码解码",
      category: "dev",
      template: "text-transform",
    });
    expect(tool?.run).toBe(runUrlCodec);
  });
});
