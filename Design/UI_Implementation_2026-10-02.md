# UI 实施记录 · 2026-10-02

> **布局更新说明（2026-10-03）**：以下记录如实描述 2026-10-02 的实现与验收，其中首页 Hero 搜索框和独立分类卡片行已被 v0.2 的 2026-10-03 定案取代。当前首页应只保留顶部唯一搜索框；空关键词下拉显示三个分类入口。此记录中的布局截图与首屏尺寸验收仅代表旧方案。

## 已确认方向

首页与全站视觉优先，沿用靛蓝紫，使用简洁静态占位形象。保留三个既有分类；角色本轮只用于首页 Hero。无需账号；收藏保存在当前浏览器。顶栏导航适配手机，系统深浅色自动跟随。

## 修改清单

| 文件 / 模块 | 本次改动 |
| --- | --- |
| src/app/globals.css | 统一深浅色色板、六档字号、等宽字体、圆角与阴影；首页、卡片、导航、手机两列布局；减少动态效果支持 |
| src/app/page.tsx、components/home/Hero.tsx | 双栏首屏、三个分类卡片、上提工具箱、注册表驱动的常用工具列表 |
| src/components/home/Mascot.tsx（新增） | 无依赖的静态 SVG 占位形象 |
| src/components/home/ToolSearch.tsx | 共用即时下拉搜索，输入法兼容、方向键选择、回车进入、Esc 收起、焦点外移收起 |
| src/components/layout/SiteHeader.tsx、SiteFooter.tsx、src/app/layout.tsx | 全站搜索、手机吸顶、开源和反馈链接、跳过导航入口 |
| src/components/tools/ToolCard.tsx、ToolFavoriteButton.tsx、ToolCategoryBrowser.tsx、src/components/ui/ToolIcon.tsx（新增） | 一致卡片、中文分类、独立星标收藏控件、固定工具排列 |
| src/components/tools/FavoriteToolsSection.tsx、FavoriteToolsList.tsx、src/app/my-toolbox/page.tsx | 收藏、最近使用、继续上次；首页摘要、完整工具箱、骨架屏与空状态 |
| src/lib/recent/service.ts、src/hooks/useRecentTools.ts、src/components/tools/ToolUsageBoundary.tsx（新增） | 仅存 id、时间戳、次数；每次访问首次有效结果记一次；损坏数据校验、高版本只读、失败提示、跨页签同步 |
| src/components/tools/templates/*.tsx | 接入使用记录；单位/进制/字数模板补齐示例、清空和复制，单位模板增加交换单位 |
| src/components/ui/CopyButton.tsx（新增）、Card.tsx | 共用复制反馈；手机卡片内边距适配 |
| src/components/tools/custom/qrcode/QRCodeEncodePanel.tsx、QRCodeDecodePanel.tsx、custom/image-ocr/ImageOcrTool.tsx | 成功产生结果后接入使用记录；沿用原有识别流程 |
| src/app/tools/[toolId]/page.tsx | 操作区最大宽度 800px、首屏简短说明、完整说明下移、无操作区装饰 |
| src/app/categories/[slug]/page.tsx、src/app/not-found.tsx（新增） | 分类面包屑、响应式列表；未找到页面提供搜索与返回首页 |
| src/lib/tools/registry.ts | 按已有 order 字段稳定排序，所有展示继续使用同一注册表 |
| src/hooks/useFavorites.ts | 浏览器清空存储时同步当前收藏状态 |
| tests/recent.test.ts（新增） | 12 项使用记录校验、计数、排序、隐私字段、版本兼容及写入失败测试 |
| tests/my-toolbox-page.test.ts | 收藏断言跟随共享组件迁移，保留原有断言内容 |
| Documents/WebsiteDesignDocument_v0.2.md | 同步既有分类展示规则、UI 决定与使用记录口径 |

公共工具定义接口、现有工具 ID、收藏存储格式与算法未改变。ToolFavoriteButton 新增向后兼容的 compact 可选参数，卡片使用紧凑星标，工具页继续显示文字。

开始本轮前已有 AGENT_RULES.md、产品文档、OCR 定义/算法及交接文档的未提交变更，本轮未撤销这些变更。未删除源文件，未新增依赖。

## 已执行验证

- ESLint、TypeScript 通过。
- Vitest：19 个测试文件、282 项测试通过。
- Production build：成功生成 17 个页面；检查时临时使用 https://studenttool.example 作为站点地址，未写入环境文件，未部署。
- 浏览器验证：jz 即时搜索、回车进入进制工具、示例运算、复制成功反馈、收藏、刷新后保留、工具箱继续上次。
- JSON：平板下示例格式化，手机下非法输入显示行号/列号与修复提示。
- 二维码：手机示例生成正常，320px CSS 宽度无横向溢出。
- OCR：检查默认本地模式、切换 DeepSeek 后上传与费用提示，未上传图片或触发识别请求。
- 桌面约 1366×768 CSS 视口：分类下缘约 518px，继续上次入口下缘约 683px，位于首屏。
- 手机 390px、窄屏 320px、平板约 1024px 和桌面布局检查；工具操作区最大宽度 800px。
- 系统暗色模式已人工查看；浅色/暗色主要文字、按钮、分类、成功和错误色的对比度均 >= 4.5:1。
- git diff --check 通过。

## 尚未验证及已知范围

- 未做真实手机软键盘、屏幕阅读器或真实 4G 性能测试。
- 未在系统浅色模式下完成人工浏览；浅色色板做了数值对比度验证。
- 本轮未执行本地 OCR 模型下载与云端 OCR 实际识别。
- 单位换算仍沿用现有长度、质量算法；方案文档中的温度/面积属于尚未实现的原有功能差距，本轮 UI 改造没有扩大算法范围。
- 最近使用记录中的演示访问来自本次浏览器验证；输入和输出内容不保存。
