import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(process.cwd(), "src", "app", "my-toolbox", "page.tsx"),
  "utf8",
);
const listSource = readFileSync(
  join(process.cwd(), "src", "components", "tools", "FavoriteToolsList.tsx"),
  "utf8",
);

describe("my-toolbox page", () => {
  it("renders a page titled 我的工具箱 with metadata", () => {
    expect(pageSource).toContain("我的工具箱");
    expect(pageSource).toContain("generateMetadata");
    expect(pageSource).toContain("getAllTools");
  });

  it("delegates the favorite list to a client component", () => {
    expect(pageSource).toContain("<FavoriteToolsList");
  });

  it("derives favorite tools from the favorites hook", () => {
    expect(listSource).toContain("useFavorites");
    expect(listSource).toContain("favoriteIds");
    expect(listSource).toContain("tools.find");
  });

  it("reuses ToolCard and does not hardcode tool ids", () => {
    expect(listSource).toContain("<ToolCard");
    expect(pageSource).not.toContain("char-count");
    expect(pageSource).not.toContain("unit-convert");
    expect(pageSource).not.toContain("base-convert");
    expect(listSource).not.toContain("char-count");
    expect(listSource).not.toContain("unit-convert");
    expect(listSource).not.toContain("base-convert");
  });

  it("handles empty favorites with a friendly hint", () => {
    expect(listSource).toContain("还没有收藏工具");
  });
});
