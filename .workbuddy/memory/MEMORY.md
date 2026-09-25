# StudentTool · 项目长期记忆

## 这是什么项目

**学生数字工具工作台**（名称未定）。面向高中生为主、大学生为辅的**纯前端在线工具网站**。

核心原则：**工具负责效率，动漫负责体验。**
明确不做：AI 助手 / 社区 / 强制登录 / 游戏化。

## 文档体系与效力顺序

| 顺序 | 文件 | 效力 |
| --- | --- | --- |
| 1 | `Documents/WebsiteDesignDocument_v0.2.md` | 产品定位、功能范围、视觉规范（**最高**） |
| 2 | `AGENT_RULES.md` | 工程实现、工作流程、目录结构（**强制**） |
| 3 | `Design/DeepSeek_Technical_Research.md` | 技术原理与方案推演（参考） |
| 4 | `Design/WorkBuddy_Design_Review.md` | 设计评审依据（参考，无约束力） |
| 5 | `Documents/WebsiteDesignDocument.md` | v0.1，**历史归档，禁止修改** |

## 项目约定（长期有效）

- **改任何文件前必须先读 `Documents/WebsiteDesignDocument_v0.2.md` 与 `AGENT_RULES.md`**
- 改前输出 3 项说明（当前结构 / 修改方案 / 可能影响），改后输出 2 项（修改内容 / 测试方式，含未验证部分）
- 一次改动只做一件事；不夹带重构；不删除已有功能
- 工具信息只能来自**单一工具注册表**，禁止硬编码工具列表
- 工具算法必须**纯函数且与 UI 分离**，每个工具 ≥10 组边界用例
- 组件**禁止直接调用 LocalStorage**，必须经过统一接口层
- 存储**禁止保存用户输入内容与转换结果**，必须带 `schemaVersion`
- 工具操作区周围 **0 个装饰元素**；角色文案必须**旁白式**，禁止第一人称

## 三条不可违反的红线

1. **角色不挡路** —— 操作区 0 装饰；角色在工具页 ≤15% 面积
2. **不做会说话的助手** —— 无对话气泡、无主动指导、无聊天功能
3. **6 个工具零缺陷** —— 工具出错一次，用户就再也不会回来

## 已定案标识符（禁止变更）

- 工具 id：`unit-convert` `char-count` `base-convert` `markdown-preview` `json-format` `base64` `url-encode` `qrcode` `image-ocr`
- 分类 slug：`convert`（转换工具）`text`（文本处理）`dev`（开发辅助）
- 源码根目录：`src/`（app / components / lib / hooks / types / content）
- 技术栈：Next.js（App Router）+ React + **TypeScript（强制）** + Tailwind CSS + LocalStorage

## 工具界面：模板与 customUI 的边界（2026-09-25 定案）

- 通用工具复用 `src/components/tools/templates/`（**总数 ≤5**，红线）。`ToolDefinition.template` 已改为**可选**。
- 交互独特、无法复用模板的工具走 **`customUI`**：`ToolDefinition.customUI` 指定 key，组件放 `src/components/tools/custom/`（`registry.tsx` 做映射）。工具页先查 customUI、再回退 template。
- 二维码工具新增依赖：`qrcode`（编码）+ `jsqr`（解码，懒加载）。
- 图片文字识别工具（`image-ocr`）走 `customUI`，依赖 `tesseract.js`（仅识别时动态 `import()` 懒加载，模型权重从 CDN 加载、图片不出浏览器）。

## 当前阶段

第一版开发前的规范阶段。第一版目标：6 个工具（上表 P0/P1/P2）做到零缺陷。

**阶段顺序**：规范 → 设计定型 → 环境搭建 → 骨架与设计系统 → **工具系统内核（分水岭）** → 6 个工具 → 收藏系统 → 首页与搜索 → 质量收尾 → SEO 与上线

## 待决策事项

项目最终名称（影响存储键名前缀）、视觉 token 色值、主角色美术资产、Markdown 渲染库选型与 XSS 过滤方案。
