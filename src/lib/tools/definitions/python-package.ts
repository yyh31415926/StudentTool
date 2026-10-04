import type { ToolDefinition } from "@/types/tools";
import { validatePackageOptions, type ProjectFile } from "../../packager/model";
export const pythonPackageTool: ToolDefinition = {
  id: "python-package", name: "程序打包", category: "dev", customUI: "python-package", order: 11,
  summary: "将 Python 项目打包为 Windows 程序，客户无需预装 Python。",
  description: "上传 Python 文件、项目文件夹或 ZIP，选择入口、依赖、资源与运行方式，生成单个 EXE 或程序文件夹 ZIP。第一阶段仅供网站本机测试可信项目，项目和结果临时保留 24 小时。",
  exampleInput: 'print("你好，Windows！")', pinyin: "cxdb", keywords: ["Python", "EXE", "PyInstaller", "程序打包", "运行环境", "依赖", "可执行文件"], tags: ["编程", "项目", "Windows"],
  tip: "先确认入口和依赖；出现资源缺失时检查资源路径。单文件失败时可尝试文件夹输出，下载后解压整个目录再运行。",
  emptyHint: "添加 Python 项目并选择入口文件。", errorHint: "请检查入口、依赖和构建日志。",
  run: input => { const value = input as { options: unknown; files: ProjectFile[] }; return validatePackageOptions(value?.options, value?.files || []); },
  seoFaq: [
    { question: "客户需要安装 Python 吗？", answer: "生成的程序包含 Python 运行环境和项目依赖，通常无需预装 Python，但外部服务、驱动等仍可能需要配置。" },
    { question: "支持哪些系统？", answer: "第一阶段生成 Windows 64 位程序，目标 Windows 10/11，需在目标电脑试运行。" },
    { question: "文件在哪里处理？", answer: "发送到网站所在的 Windows 电脑构建，项目与结果临时保存 24 小时；第一阶段仅供本机试用。" },
  ],
};
