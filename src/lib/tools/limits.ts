/**
 * 运行时边界保护：所有工具共用的输入 / 输出 / 嵌套深度上限。
 *
 * 集中定义这些上限，是为了防止"粘贴一份超大文档"或"深层嵌套数据"让浏览器
 * 卡死或内存耗尽。它们只拦截异常输入，不影响任何正常使用场景。
 *
 * 数值说明（长度均按 UTF-16 码元计）：
 * - MAX_INPUT_LENGTH  约 5MB 文本，远超学生正常粘贴的内容。
 * - MAX_NESTING_DEPTH 保护 JSON 解析的递归深度，同时把"格式化"缩进造成的
 *   平方级放大限制在可控范围内。
 * - MAX_OUTPUT_LENGTH 兜底限制"格式化"输出的体积放大（输入 + 缩进），防止
 *   深层宽结构把几 KB 输入放大成几十 MB 输出。
 */
export const MAX_INPUT_LENGTH = 5_000_000;
export const MAX_NESTING_DEPTH = 1_000;
export const MAX_OUTPUT_LENGTH = 10_000_000;
