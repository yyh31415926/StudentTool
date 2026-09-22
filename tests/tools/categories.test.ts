import { describe, expect, it } from "vitest";
import {
  CATEGORY_OPTIONS,
  getAvailableCategories,
} from "../../src/lib/tools/categories";

describe("tool categories", () => {
  it("defines the three settled categories in order", () => {
    expect(CATEGORY_OPTIONS.map((category) => category.slug)).toEqual([
      "convert",
      "text",
      "dev",
    ]);
    expect(CATEGORY_OPTIONS.map((category) => category.name)).toEqual([
      "转换工具",
      "文本处理",
      "开发辅助",
    ]);
  });

  it("drops categories that have no tools", () => {
    const tools = [
      { category: "convert" },
      { category: "convert" },
      { category: "text" },
    ] as const;

    expect(getAvailableCategories(tools).map((category) => category.slug)).toEqual(
      ["convert", "text"],
    );
  });

  it("keeps every category that has at least one tool", () => {
    const tools = [
      { category: "convert" },
      { category: "text" },
      { category: "dev" },
    ] as const;

    expect(getAvailableCategories(tools).map((category) => category.slug)).toEqual(
      ["convert", "text", "dev"],
    );
  });

  it("returns an empty list when there are no tools", () => {
    expect(getAvailableCategories([])).toEqual([]);
  });
});
