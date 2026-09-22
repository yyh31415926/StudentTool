import type { ToolDefinition } from "@/types/tools";
import { runBaseConversion } from "../base-convert";
import { MAX_INPUT_LENGTH } from "../limits";

export const baseConvertTool: ToolDefinition = {
  id: "base-convert",
  name: "进制转换",
  category: "convert",
  description: "在二进制、八进制、十进制和十六进制之间进行整数转换。",
  summary: "二进制、八进制、十进制、十六进制整数互转，支持大数。",
  tags: ["数学", "计算机", "信息课", "高中"],
  keywords: ["进制转换", "二进制", "八进制", "十进制", "十六进制", "进制换算", "二进制转十进制"],
  pinyin: "jz",
  order: 3,
  template: "base-converter",
  tip: "支持整数、正负号、前导零，以及十六进制的 0x/0X 前缀；暂不支持小数。",
  emptyHint: "请输入需要转换的整数。",
  errorHint: "请输入符合所选进制的整数，例如二进制只含 0 和 1；暂不支持小数。",
  seoFaq: [
    { question: "进制转换支持哪些进制？", answer: "支持二进制、八进制、十进制和十六进制整数互转。" },
    { question: "超大整数会丢失精度吗？", answer: "不会，工具使用 BigInt 处理整数，并在浏览器本地计算。" },
  ],
  exampleInput: "1010",
  run: (input) => {
    if (typeof input === "object" && input !== null) {
      const value = (input as { value?: unknown }).value;
      if (typeof value === "string" && value.length > MAX_INPUT_LENGTH) {
        throw new Error("输入内容过长，请分次处理或粘贴更短的内容。");
      }
    }
    return runBaseConversion(input);
  },
};
