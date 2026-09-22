import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllCategories } from "../src/lib/tools/categories";

const pageSource = readFileSync(
  join(process.cwd(), "src", "app", "categories", "[slug]", "page.tsx"),
  "utf8",
);

describe("category page (registry-driven)", () => {
  it("derives static params from getAllCategories", () => {
    expect(pageSource).toContain("generateStaticParams");
    expect(pageSource).toContain("getAllCategories()");
    expect(pageSource).toContain("slug: category.slug");
  });

  it("exposes a page for each of the three settled categories", () => {
    expect(getAllCategories().map((category) => category.slug)).toEqual([
      "convert",
      "text",
      "dev",
    ]);
  });

  it("calls notFound for unknown categories", () => {
    expect(pageSource).toContain('from "next/navigation"');
    expect(pageSource).toContain("notFound()");
  });

  it("reuses ToolCard and does not hardcode tool ids", () => {
    expect(pageSource).toContain("<ToolCard");
    expect(pageSource).not.toContain("char-count");
    expect(pageSource).not.toContain("unit-convert");
    expect(pageSource).not.toContain("base-convert");
    expect(pageSource).not.toContain("json-format");
    expect(pageSource).not.toContain("base64");
    expect(pageSource).not.toContain("url-encode");
  });

  it("builds metadata from category data without hardcoding names", () => {
    expect(pageSource).toContain("generateMetadata");
    expect(pageSource).toContain("category.name");
    expect(pageSource).toContain("category.description");
  });
});
