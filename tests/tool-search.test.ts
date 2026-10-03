import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  normalizeSearchQuery,
  resolveSearchView,
  searchTools,
  type SearchableTool,
} from "../src/components/home/search-tools";
import { getAvailableCategories } from "../src/lib/tools/categories";

const toolSearchSource = readFileSync(
  fileURLToPath(
    new URL("../src/components/home/ToolSearch.tsx", import.meta.url),
  ),
  "utf8",
);
const heroSource = readFileSync(
  fileURLToPath(new URL("../src/components/home/Hero.tsx", import.meta.url)),
  "utf8",
);
const notFoundSource = readFileSync(
  fileURLToPath(new URL("../src/app/not-found.tsx", import.meta.url)),
  "utf8",
);

const tools: readonly SearchableTool[] = [
  {
    id: "base-convert",
    name: "进制转换",
    category: "convert",
    summary: "二进制、八进制、十进制、十六进制互转",
    keywords: ["进制", "binary", "hex"],
    tags: ["数学", "信息课"],
    pinyin: "jz",
  },
  {
    id: "char-count",
    name: "字数统计",
    category: "text",
    summary: "统计字符数、字数、行数",
    keywords: ["字数", "作文"],
    tags: ["语文"],
    pinyin: "zs",
  },
  {
    id: "base64",
    name: "Base64 转换",
    category: "dev",
    summary: "Base64 编码与解码",
    keywords: ["base64", "编码"],
    tags: ["计算机"],
    pinyin: "b64",
  },
];

describe("search query normalization", () => {
  it("treats empty and whitespace-only queries as empty", () => {
    expect(normalizeSearchQuery("")).toBe("");
    expect(normalizeSearchQuery("   ")).toBe("");
    expect(normalizeSearchQuery("\t\n ")).toBe("");
  });

  it("trims and lowercases a real query", () => {
    expect(normalizeSearchQuery("  JZ ")).toBe("jz");
  });
});

describe("search dropdown view", () => {
  it("shows category entries when the query is empty or whitespace only", () => {
    expect(resolveSearchView("")).toBe("categories");
    expect(resolveSearchView("   ")).toBe("categories");
  });

  it("shows matching tools once the query has content", () => {
    expect(resolveSearchView("进")).toBe("tools");
    expect(resolveSearchView("jz")).toBe("tools");
  });
});

describe("tool matching", () => {
  it("returns no tools for an empty query instead of every tool", () => {
    expect(searchTools(tools, "")).toEqual([]);
    expect(searchTools(tools, "   ")).toEqual([]);
  });

  it("matches on name and keeps the passed-in order", () => {
    expect(searchTools(tools, "进").map((tool) => tool.id)).toEqual([
      "base-convert",
    ]);
  });

  it("matches on keyword, tag and summary", () => {
    expect(searchTools(tools, "作文").map((tool) => tool.id)).toEqual([
      "char-count",
    ]);
    expect(searchTools(tools, "信息课").map((tool) => tool.id)).toEqual([
      "base-convert",
    ]);
    expect(searchTools(tools, "解码").map((tool) => tool.id)).toEqual([
      "base64",
    ]);
  });

  it("matches pinyin initials regardless of case", () => {
    expect(searchTools(tools, "jz").map((tool) => tool.id)).toEqual([
      "base-convert",
    ]);
    expect(searchTools(tools, "JZ").map((tool) => tool.id)).toEqual([
      "base-convert",
    ]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(searchTools(tools, "  jz  ").map((tool) => tool.id)).toEqual([
      "base-convert",
    ]);
  });

  it("returns an empty result when nothing matches", () => {
    expect(searchTools(tools, "不存在的工具")).toEqual([]);
  });
});

describe("category entries in the dropdown", () => {
  it("uses the settled categories, order and names from the shared data source", () => {
    const categories = getAvailableCategories(tools);

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
    expect(categories.map((category) => `/categories/${category.slug}`)).toEqual([
      "/categories/convert",
      "/categories/text",
      "/categories/dev",
    ]);
  });

  it("drops a category that has no tools", () => {
    const categories = getAvailableCategories([
      { category: "convert" },
      { category: "dev" },
    ] as const);

    expect(categories.map((category) => category.slug)).toEqual([
      "convert",
      "dev",
    ]);
  });

  it("builds category links from the shared slug, not a local map", () => {
    expect(toolSearchSource).toContain("`/categories/${category.slug}`");
    expect(toolSearchSource).not.toContain('"/categories/convert"');
    expect(toolSearchSource).not.toContain('"转换工具"');
    expect(toolSearchSource).not.toContain('"文本处理"');
    expect(toolSearchSource).not.toContain('"开发辅助"');
  });

  it("shows the category list only while the tool result list is empty", () => {
    expect(toolSearchSource).toContain('resolveSearchView(query)');
    expect(toolSearchSource).toContain('"categories"');
    expect(toolSearchSource).toContain('router.push(`/tools/${tool.id}`)');
  });
});

describe("single site-wide search box", () => {
  it("keeps no second search box in the hero", () => {
    expect(heroSource).not.toContain("ToolSearch");
    expect(heroSource).not.toContain("试着搜索");
  });

  it("keeps no extra search box on the 404 page", () => {
    expect(notFoundSource).not.toContain("ToolSearch");
    expect(notFoundSource).toContain('href="/"');
  });
});
