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
  tip: "工具会自动判断输入是普通文字还是 Base64：含中文或 Emoji 时编码，符合 Base64 格式时解码。",
  keywords: ["base64", "Base64编码", "Base64解码", "base64转换"],
  tags: ["计算机", "信息课", "高中"],
  pinyin: "b",
  order: 6,
  emptyHint: "请输入需要编码或解码的文本。",
  errorHint:
    "无法转换。请确认输入是要编码的普通文字，或是标准 / URL-safe 的 Base64；检查字符与填充符号 =。",
  seoFaq: [
    { question: "Base64 转换支持中文和 Emoji 吗？", answer: "支持，工具使用 UTF-8 处理中文、日文、Emoji 和混合文本。" },
    { question: "Base64 转换会上传内容吗？", answer: "不会，编码和解码都在当前浏览器中完成。" },
  ],
  run: runBase64Transform,
};
