import type { ToolDefinition } from "@/types/tools";
import { runUnitConversion } from "../unit-convert";

export const unitConvertTool: ToolDefinition = {
  id: "unit-convert",
  name: "单位换算",
  category: "convert",
  description: "在长度和质量单位之间进行快速换算。",
  template: "converter",
  exampleInput: "100",
  run: runUnitConversion,
};
