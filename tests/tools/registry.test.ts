import { describe, expect, it } from "vitest";
import {
  getAllTools,
  getToolById,
  getToolsByCategory,
} from "../../src/lib/tools/registry";

describe("tool registry", () => {
  it("returns all registered tools", () => {
    const tools = getAllTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]?.id).toBe("mock-tool");
  });

  it("finds a tool by id", () => {
    expect(getToolById("mock-tool")?.name).toBe("示例工具");
  });

  it("returns undefined for an unknown id", () => {
    expect(getToolById("missing-tool")).toBeUndefined();
  });

  it("filters tools by category", () => {
    expect(getToolsByCategory("dev").map((tool) => tool.id)).toEqual([
      "mock-tool",
    ]);
    expect(getToolsByCategory("convert")).toHaveLength(0);
  });

  it("exposes the minimal definition contract", () => {
    const tool = getToolById("mock-tool");

    expect(tool).toMatchObject({
      id: "mock-tool",
      name: "示例工具",
      category: "dev",
      description: expect.any(String),
      template: "placeholder",
      run: expect.any(Function),
    });
  });

  it("keeps the mock run function pure and environment independent", () => {
    const tool = getToolById("mock-tool");

    expect(tool?.run("sample input")).toBe("sample input");
  });
});
