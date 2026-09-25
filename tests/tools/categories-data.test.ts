import { describe, expect, it } from "vitest";
import { getAllTools } from "../../src/lib/tools/registry";
import {
  getAllCategories,
  getToolsByCategory,
} from "../../src/lib/tools/categories";

describe("registry-driven category data layer", () => {
  it("returns exactly three settled categories with slug/name/count/tools", () => {
    const categories = getAllCategories();

    expect(categories.map((category) => category.slug)).toEqual([
      "convert",
      "text",
      "dev",
    ]);
    expect(categories.map((category) => category.name)).toEqual([
      "转换工具",
      "文本处理",
      "开发辅助",
    ]);

    for (const category of categories) {
      expect(category.count).toBe(category.tools.length);
    }
  });

  it("assigns the seven registered tools to the correct categories", () => {
    const bySlug = new Map(
      getAllCategories().map((category) => [category.slug, category]),
    );

    expect(bySlug.get("convert")?.tools.map((tool) => tool.id).sort()).toEqual([
      "base-convert",
      "unit-convert",
    ]);
    expect(bySlug.get("text")?.tools.map((tool) => tool.id)).toEqual([
      "char-count",
    ]);
    expect(bySlug.get("dev")?.tools.map((tool) => tool.id).sort()).toEqual([
      "base64",
      "json-format",
      "qrcode",
      "url-encode",
    ]);
  });

  it("returns tools for a known slug", () => {
    expect(getToolsByCategory("convert").map((tool) => tool.id).sort()).toEqual([
      "base-convert",
      "unit-convert",
    ]);
  });

  it("returns an empty array for an unknown slug without throwing", () => {
    expect(getToolsByCategory("not-a-category")).toEqual([]);
    expect(getToolsByCategory("")).toEqual([]);
    expect(getToolsByCategory("text ")).toEqual([]);
  });

  it("derives tools purely from the registry (new tools need no category change)", () => {
    const categories = getAllCategories();
    const categoryTools = categories.flatMap((category) => category.tools);

    // 每个分类下的工具都属于该分类（过滤正确，无跨分类串味）
    for (const category of categories) {
      expect(
        category.tools.every((tool) => tool.category === category.slug),
      ).toBe(true);
    }

    // 分类层覆盖注册表全部工具、无遗漏也无重复（未硬编码工具列表）
    expect(categoryTools).toHaveLength(getAllTools().length);
  });
});
