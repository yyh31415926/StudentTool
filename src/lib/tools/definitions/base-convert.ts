import type { ToolDefinition } from "@/types/tools";
import { runBaseConversion } from "../base-convert";

export const baseConvertTool: ToolDefinition = {
  id: "base-convert",
  name: "进制转换",
  category: "convert",
  description: "在二进制、八进制、十进制和十六进制之间进行整数转换。",
  template: "base-converter",
  exampleInput: "1010",
  run: runBaseConversion,
};
