import type { ToolDefinition } from "@/types/tools";
import { runUnitConversion } from "../unit-convert";

export const unitConvertTool: ToolDefinition = {
  id: "unit-convert",
  name: "单位换算",
  category: "convert",
  description: "在长度和质量单位之间进行快速换算。",
  summary: "在长度和质量单位之间快速换算，输入数值即可实时得到结果。",
  tags: ["物理", "数学", "作业", "高中"],
  keywords: ["单位换算", "长度换算", "质量换算", "单位转换", "米厘米", "千克克", "换算"],
  pinyin: "dw",
  order: 1,
  template: "converter",
  tip: "选择单位类型和单位，输入数值后结果实时更新；长度与质量各自独立换算。",
  emptyHint: "请输入需要换算的数值。",
  errorHint: "请输入有效数字，并在同一单位类型（长度或质量）内进行换算。",
  seoFaq: [
    { question: "单位换算支持哪些单位？", answer: "当前支持长度和质量单位的常用换算。" },
    { question: "单位换算会上传输入内容吗？", answer: "不会，换算在当前浏览器中完成。" },
  ],
  exampleInput: "100",
  run: runUnitConversion,
};
