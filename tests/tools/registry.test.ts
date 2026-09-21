import { describe, expect, it } from "vitest";
import {
  getAllTools,
  getToolById,
  getToolsByCategory,
} from "../../src/lib/tools/registry";

describe("tool registry", () => {
  it("returns all registered tools", () => {
    const tools = getAllTools();

    expect(tools).toHaveLength(3);
    expect(tools[0]?.id).toBe("char-count");
    expect(tools[1]?.id).toBe("unit-convert");
    expect(tools[2]?.id).toBe("base-convert");
  });

  it("finds a tool by id", () => {
    expect(getToolById("char-count")?.name).toBe("字数统计");
    expect(getToolById("unit-convert")?.name).toBe("单位换算");
    expect(getToolById("base-convert")?.name).toBe("进制转换");
  });

  it("returns undefined for an unknown id", () => {
    expect(getToolById("missing-tool")).toBeUndefined();
  });

  it("filters tools by category", () => {
    expect(getToolsByCategory("text").map((tool) => tool.id)).toEqual([
      "char-count",
    ]);
    expect(getToolsByCategory("dev")).toHaveLength(0);
    expect(getToolsByCategory("convert").map((tool) => tool.id)).toEqual([
      "unit-convert",
      "base-convert",
    ]);
  });

  it("exposes the minimal definition contract", () => {
    const tool = getToolById("char-count");

    expect(tool).toMatchObject({
      id: "char-count",
      name: "字数统计",
      category: "text",
      description: expect.any(String),
      template: "counter",
      exampleInput: expect.any(String),
      run: expect.any(Function),
    });
  });

  it("exposes the char-count run function", () => {
    const tool = getToolById("char-count");

    expect(tool?.run("你好")).toMatchObject({
      characterCount: 2,
      chineseCharacterCount: 2,
      englishWordCount: 0,
      lineCount: 1,
    });
  });

  it("exposes the base-convert run function", () => {
    const tool = getToolById("base-convert");

    expect(
      tool?.run({ value: "1010", inputBaseId: "binary" }),
    ).toMatchObject({
      decimal: "10",
      hexadecimal: "A",
    });
  });
});
