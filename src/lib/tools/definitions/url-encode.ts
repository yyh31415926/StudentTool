import type { ToolDefinition } from "@/types/tools";
import { runUrlCodec } from "../url-encode";

export const urlEncodeTool: ToolDefinition = {
  id: "url-encode",
  name: "URL 编码解码",
  category: "dev",
  template: "text-transform",
  tags: ["计算机", "信息课", "高中", "网络"],
  keywords: [
    "url编码",
    "URL编码",
    "url解码",
    "URL解码",
    "urlencode",
    "urldecode",
    "百分号编码",
  ],
  pinyin: "url",
  summary: "把网址里的乱码字符还原成原文，或给含中文的链接做转义。",
  description:
    "URL 编码把网址里不能直接出现的字符（空格、中文、Emoji、&、= 等）写成 %XX 形式；解码则把它们还原成原文。",
  tip: "网址查询串里的 + 表示空格，本工具按标准 %20 处理：+ 会原样保留，需要还原成空格时把它改成 %20 再运行。",
  exampleInput: "search%3Fq%3D%E4%BD%A0%E5%A5%BD",
  emptyHint: "请输入需要编码或解码的内容。",
  order: 7,
  run: runUrlCodec,
};
