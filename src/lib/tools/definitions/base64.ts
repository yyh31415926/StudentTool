import type { ToolDefinition } from "@/types/tools";
import { runBase64Transform } from "../base64";

export const base64Tool: ToolDefinition = {
  id: "base64",
  name: "Base64 转换",
  category: "dev",
  template: "text-transform",
  exampleInput: "5L2g5aW9",
  summary: "把文字与 Base64 互相转换，中文和 Emoji 都不会乱码。",
  description:
    "Base64 是一种把文本或二进制数据表示为 ASCII 字符的编码方式。输入普通文字即可编码，输入标准或 URL-safe Base64 即可解码；支持中文、日文、Emoji 和混合文本，全部在浏览器中使用 UTF-8 纯计算完成。",
  keywords: ["base64", "Base64编码", "Base64解码", "base64转换"],
  tags: ["计算机", "信息课", "高中"],
  pinyin: "b",
  order: 6,
  run: runBase64Transform,
};
