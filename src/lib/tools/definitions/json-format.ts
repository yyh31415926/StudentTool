import type { ToolDefinition } from "@/types/tools";
import { runJsonFormat } from "../json-format";

export const jsonFormatTool: ToolDefinition = {
  id: "json-format",
  name: "JSON 格式化",
  category: "dev",
  template: "text-transform",
  actions: [
    { id: "format", label: "格式化" },
    { id: "minify", label: "压缩" },
    { id: "validate", label: "校验" },
  ],
  exampleInput:
    '{"student":"小明","class":"高二(3)班","scores":[98,87,100],"passed":true,"mood":"😀","note":null,"profile":{"seat":12,"tags":["数学","物理"]}}',
  summary: "把挤成一行的 JSON 排版成可读的层级结构，并指出哪里写错了。",
  description:
    "JSON 是一种用花括号和方括号描述数据的文本格式：对象写在 {} 里，数组写在 [] 里，键和字符串必须用双引号。本工具把压缩的 JSON 展开成带缩进的层级，也可以压缩回一行，或只做一次校验；写法有错时会给出行号、列号和原因。全部计算在浏览器中完成，输入的内容不会上传。",
  tip: "标准 JSON 不允许尾逗号、注释和单引号；从代码或配置文件里复制过来的内容常带这些写法，删掉后再运行即可。格式化只调整空白，不会改写数字和字符串的写法。",
  keywords: [
    "json",
    "JSON",
    "json格式化",
    "JSON格式化",
    "json压缩",
    "JSON压缩",
    "json校验",
    "JSON校验",
    "json美化",
    "json在线解析",
  ],
  tags: ["计算机", "信息课", "编程", "高中"],
  pinyin: "json",
  order: 5,
  emptyHint: "请输入需要处理的 JSON 文本。",
  seoFaq: [
    { question: "JSON 格式化支持哪些操作？", answer: "支持格式化、压缩和校验，并会在错误时提示行号、列号和原因。" },
    { question: "JSON 格式化会改写数字或字符串吗？", answer: "不会，格式化和压缩只调整空白，数字、字符串和转义写法按原文保留。" },
  ],
  run: runJsonFormat,
};
