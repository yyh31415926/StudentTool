import type { ToolDefinition } from "@/types/tools";
import { countCharacters } from "../char-count";
import { MAX_INPUT_LENGTH } from "../limits";

export const charCountTool: ToolDefinition = {
  id: "char-count",
  name: "字数统计",
  category: "text",
  description: "实时统计文本中的字符数、中文字符数、英文单词数和行数。",
  summary: "统计字符数、中文字符数、英文单词数和行数，看清作文是否达标。",
  tags: ["语文", "作文", "写作", "高中"],
  keywords: ["字数统计", "字符统计", "作文字数", "字数", "字符数", "统计字数"],
  pinyin: "zs",
  order: 2,
  template: "counter",
  tip: "字符数包含空格、标点和 Emoji 但不含换行符；中文字符数只统计汉字，英文单词按连续字母统计。",
  emptyHint: "尚未输入文本，统计结果均为 0。",
  errorHint: "字数统计只接受文本输入，请粘贴或输入文字后再查看结果。",
  seoFaq: [
    { question: "字数统计支持哪些内容？", answer: "支持中文、英文、数字、标点、空格、Emoji 和多行文本。" },
    { question: "字数统计会上传我的内容吗？", answer: "不会，统计在当前浏览器中完成，输入内容不会上传。" },
  ],
  exampleInput: "StudentTool 是一个学生数字工具工作台。\nHello world!",
  run: (input: unknown) => {
    if (typeof input !== "string") {
      throw new TypeError("字数统计只接受文本输入。");
    }
    if (input.length > MAX_INPUT_LENGTH) {
      throw new Error("输入内容过长，请分次处理或粘贴更短的内容。");
    }

    return countCharacters(input);
  },
};
