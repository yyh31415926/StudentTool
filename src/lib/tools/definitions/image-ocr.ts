import type { ToolDefinition } from "@/types/tools";
import { runImageOcr } from "../image-ocr";

export const imageOcrTool: ToolDefinition = {
  id: "image-ocr",
  name: "图片文字识别",
  category: "text",
  customUI: "image-ocr",
  summary:
    "把图片里的文字提取成可复制文本；可选本地浏览器识别或 DeepSeek 云端识别。",
  description:
    "提取图片中的中英文文字，结果可编辑和复制。默认在浏览器本地识别；选择 DeepSeek 并开始识别后，图片会发送到服务端并转交 DeepSeek，可能产生费用。",
  tip: "清晰、端正的印刷体识别效果最好；识别结果建议人工核对，尤其是数字、标点和形近字。",
  exampleInput: "",
  keywords: [
    "图片文字识别",
    "图片识别",
    "文字识别",
    "图片转文字",
    "提取文字",
    "识图",
    "OCR",
    "ocr",
  ],
  tags: ["语文", "学习", "高中", "信息课"],
  pinyin: "tpsb",
  order: 9,
  emptyHint: "尚未上传图片。请选择、拖拽或粘贴一张图片开始识别。",
  errorHint: "识别失败，请换一张更清晰的图片，或调整语言后重试。",
  seoFaq: [
    {
      question: "图片文字识别支持哪些图片格式？",
      answer: "支持 PNG、JPG/JPEG 和 WebP 图片，单张不超过 10MB。",
    },
    {
      question: "识别会联网上传我的图片吗？",
      answer:
        "默认本地模式会在当前浏览器中处理图片，不会上传图片。只有你主动选择 DeepSeek 模式并开始识别时，图片才会发送到本项目服务端并转交 DeepSeek API；第三方处理可能产生费用。图片不会写入本项目磁盘或持久存储。",
    },
    {
      question: "支持哪些语言？",
      answer:
        "支持简体中文、英文，以及中英混合（默认）。可在识别前切换语言。",
    },
    {
      question: "什么样的图片识别效果最好？",
      answer:
        "清晰、端正的印刷体效果最好；模糊、倾斜或手写的图片可能识别不准确，建议尽量使用清晰的正面拍摄图或截图。",
    },
  ],
  run: runImageOcr,
};
