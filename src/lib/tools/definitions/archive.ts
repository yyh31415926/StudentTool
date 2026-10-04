import type { ToolDefinition } from "@/types/tools";
import { validateArchivePlan } from "../archive";

export const archiveTool: ToolDefinition = {
  id: "archive",
  name: "压缩&解压",
  category: "convert",
  customUI: "archive",
  summary: "本地打包文件或文字，解压 ZIP、7z、RAR 等多种压缩包。",
  description: "在浏览器本地压缩与解压。可输入文字、选择文件、粘贴或拖拽添加内容。支持创建 ZIP、7z、TAR、TAR.GZ、TAR.BZ2、TAR.XZ、GZ、BZ2、XZ，RAR 仅支持解压。输入与结果不会上传或保存。",
  exampleInput: "我的学习笔记\n今天完成了数学复习。",
  tip: "多个文件优先使用 ZIP 或 7z；TAR 只打包，GZ、BZ2、XZ 只压缩单个文件。已压缩的图片、视频再次压缩可能不会明显变小。",
  keywords: ["压缩", "解压", "打包", "压缩包", "ZIP", "7z", "RAR", "TAR", "GZIP", "BZIP2", "XZ"],
  tags: ["文件", "学习", "信息课"],
  pinyin: "ysjy",
  order: 10,
  emptyHint: "添加文件或输入文字，然后选择压缩或解压。",
  errorHint: "处理失败，请检查文件格式、密码和大小。",
  run: validateArchivePlan,
  seoFaq: [
    { question: "文件会上传到服务器吗？", answer: "不会。文件、文字与解压密码仅在当前浏览器内处理，不上传或持久保存。" },
    { question: "支持压缩成 RAR 吗？", answer: "RAR 仅支持解压。可创建 ZIP、7z、TAR、TAR.GZ、TAR.BZ2、TAR.XZ、GZ、BZ2、XZ。" },
    { question: "文件大小有什么限制？", answer: "输入总大小最多 50 MB，解压结果最多 100 MB 或 1000 项。大文件建议使用桌面压缩软件。" },
  ],
};
