import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const toolPageSource = readFileSync(
  join(process.cwd(), "src", "app", "tools", "[toolId]", "page.tsx"),
  "utf8",
);
const breadcrumbsSource = readFileSync(
  join(process.cwd(), "src", "components", "layout", "Breadcrumbs.tsx"),
  "utf8",
);
const headerSource = readFileSync(
  join(process.cwd(), "src", "components", "layout", "SiteHeader.tsx"),
  "utf8",
);

describe("tool page breadcrumbs and favorites", () => {
  it("renders breadcrumbs on the tool page", () => {
    expect(toolPageSource).toContain("<Breadcrumbs");
    expect(toolPageSource).toContain('label: "首页"');
  });

  it("derives the category breadcrumb from category data", () => {
    expect(toolPageSource).toContain("getAllCategories");
    expect(toolPageSource).toContain("tool.category");
    expect(toolPageSource).toContain("/categories/");
  });

  it("renders a favorite button on the tool page", () => {
    expect(toolPageSource).toContain("<ToolFavoriteButton");
    expect(toolPageSource).toContain("tool.id");
  });

  it("adds a 我的工具箱 entry to the header", () => {
    expect(headerSource).toContain("/my-toolbox");
    expect(headerSource).toContain("我的工具箱");
  });

  it("does not hardcode tool ids in breadcrumbs", () => {
    expect(breadcrumbsSource).not.toContain("char-count");
    expect(breadcrumbsSource).not.toContain("unit-convert");
    expect(breadcrumbsSource).not.toContain("base-convert");
  });
});
