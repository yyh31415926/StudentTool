import type { ToolDefinition } from "@/types/tools";
import { runQrEncode } from "../qrcode";

export const qrcodeTool: ToolDefinition = {
  id: "qrcode",
  name: "二维码工具",
  category: "dev",
  customUI: "qrcode",
  summary: "把文字或网址生成二维码，也可以上传图片读出二维码里的内容。",
  description:
    "二维码是一种用黑白方格存储信息的图形编码。本工具提供两个方向：把文字、网址、中文或 Emoji 生成二维码（可调尺寸、颜色、纠错等级和模块样式），或上传一张二维码图片识别出里面的内容。全部计算都在浏览器本地完成，输入的内容与图片都不会上传。",
  tip: "扫不出时先看前景与背景的对比度是否足够；图片里有多个二维码时，识别的是检测到的第一个。",
  exampleInput: "https://example.com",
  keywords: [
    "二维码",
    "二维码生成",
    "二维码识别",
    "二维码解码",
    "qrcode",
    "QR code",
    "扫码",
  ],
  tags: ["计算机", "信息课", "编程", "高中"],
  pinyin: "ewm",
  order: 8,
  emptyHint: "请输入要生成二维码的内容。",
  errorHint: "无法生成二维码，请检查输入内容是否过长，或颜色格式是否正确。",
  seoFaq: [
    { question: "二维码工具支持中文和 Emoji 吗？", answer: "支持，生成时按 UTF-8 处理中文、Emoji 和混合文本。" },
    { question: "生成或识别二维码会联网上传吗？", answer: "不会，生成和识别都在当前浏览器本地完成，内容与图片不会上传或保存。" },
    { question: "支持哪些二维码图片格式？", answer: "支持上传 PNG、JPG/JPEG 和 WebP 图片，单张不超过 5MB。" },
  ],
  run: runQrEncode,
};
