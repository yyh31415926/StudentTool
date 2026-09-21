import type { ToolDefinition } from "@/types/tools";
import { countCharacters } from "../char-count";

export const charCountTool: ToolDefinition = {
  id: "char-count",
  name: "字数统计",
  category: "text",
  description: "实时统计文本中的字符数、中文字符数、英文单词数和行数。",
  template: "counter",
  exampleInput: "StudentTool 是一个学生数字工具工作台。\nHello world!",
  run: (input: unknown) => {
    if (typeof input !== "string") {
      throw new TypeError("字数统计只接受文本输入。");
    }

    return countCharacters(input);
  },
};
