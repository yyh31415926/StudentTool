import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const homePageSource = readFileSync(
  fileURLToPath(new URL("../src/app/page.tsx", import.meta.url)),
  "utf8",
);
const toolCardSource = readFileSync(
  fileURLToPath(
    new URL("../src/components/tools/ToolCard.tsx", import.meta.url),
  ),
  "utf8",
);

describe("home page tool discovery", () => {
  it("gets the home page tool list from the registry", () => {
    expect(homePageSource).toContain(
      'import { getAllTools } from "@/lib/tools/registry"',
    );
    expect(homePageSource).toContain("const tools = getAllTools();");
    expect(homePageSource).toContain("tools.map((tool)");
    expect(homePageSource).toContain("<ToolCard key={tool.id} tool={tool} />");
  });

  it("does not hardcode registered tool ids on the home page", () => {
    expect(homePageSource).not.toContain("char-count");
    expect(homePageSource).not.toContain("unit-convert");
    expect(homePageSource).not.toContain("base-convert");
  });

  it("builds each tool link from the registered tool id", () => {
    expect(toolCardSource).toContain('href={`/tools/${tool.id}`}');
  });
});
