/**
 * 图片文字识别（OCR）工具的纯函数核心。
 *
 * 不依赖 React、不读写任何外部状态：同样的输入永远得到同样的输出。
 *
 * 职责边界（与 qrcode.ts 一致）：
 * - 纯函数部分（图片类型 / 大小 / 尺寸校验、语言归一化、缩放计算、run 入口）
 *   放在这里，可独立测试。
 * - 真正的识别依赖 tesseract.js 的 WASM 引擎与像素数据，是异步的，放在
 *   客户端组件里做懒加载，不进入本模块，避免把它打进服务端 bundle。
 *
 * 隐私边界：识别完全在浏览器本地完成，图片不会上传到任何服务器；这里只做
 * 输入校验与配置归一化，不持有、不保存任何图片数据。
 */

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

/** 单张图片大小上限：10MB。 */
export const OCR_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** 图片最长边绝对上限（像素）。超过直接报错，避免解码耗尽浏览器内存。 */
export const OCR_MAX_DIMENSION = 8192;

/** 识别前把最长边缩放到该值以内，进一步降低 tesseract 的内存占用。 */
export const OCR_WORK_DIMENSION = 2500;

/** 允许上传的图片 MIME 类型。 */
export const OCR_SUPPORTED_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

/* ------------------------------------------------------------------ *
 * 语言选择
 * ------------------------------------------------------------------ */

export type OcrLanguage = "zh" | "en" | "mixed";

export type OcrLanguageOption = {
  id: OcrLanguage;
  label: string;
  /** tesseract.js 使用的语言串。 */
  lang: string;
};

export const OCR_LANGUAGE_OPTIONS: readonly OcrLanguageOption[] = [
  { id: "zh", label: "简体中文", lang: "chi_sim" },
  { id: "en", label: "英文", lang: "eng" },
  { id: "mixed", label: "中英混合", lang: "chi_sim+eng" },
];

/** 默认语言：中英混合（即「简体中文 + 英文」）。 */
export const OCR_DEFAULT_LANGUAGE: OcrLanguage = "mixed";

/**
 * 归一化语言选择。未提供时使用默认值（中英混合），非法值抛错。
 */
export function normalizeOcrLanguage(language: unknown): OcrLanguageOption {
  const id =
    language === undefined || language === null
      ? OCR_DEFAULT_LANGUAGE
      : language;
  const option = OCR_LANGUAGE_OPTIONS.find((item) => item.id === id);

  if (!option) {
    throw new Error(
      "语言选择不正确，请在「简体中文 / 英文 / 中英混合」中选择。",
    );
  }

  return option;
}

/* ------------------------------------------------------------------ *
 * 图片（类型 / 大小 / 尺寸）校验
 * ------------------------------------------------------------------ */

export function isSupportedImageType(type: string): boolean {
  return OCR_SUPPORTED_IMAGE_TYPES.includes(type.toLowerCase());
}

/**
 * 归一化图片 MIME 类型。部分浏览器 / 文件在 `File.type` 为空时，
 * 用文件名后缀兜底；仍无法识别时返回空字符串。
 */
export function resolveImageType(fileName: string, mimeType: string): string {
  if (mimeType) {
    return mimeType;
  }

  const lower = fileName.toLowerCase();

  if (lower.endsWith(".png")) {
    return "image/png";
  }

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lower.endsWith(".webp")) {
    return "image/webp";
  }

  return "";
}

/**
 * 校验上传图片的类型与大小。不合法时抛错，错误信息面向用户。
 */
export function validateImageMeta(meta: { type: string; size: number }): void {
  if (!isSupportedImageType(meta.type)) {
    throw new Error("不支持的图片格式，请上传 PNG、JPG/JPEG 或 WebP 图片。");
  }

  if (meta.size > OCR_IMAGE_MAX_BYTES) {
    throw new Error("图片大小超过 10MB，请压缩图片后再上传。");
  }
}

/**
 * 校验图片的实际尺寸（解码后）。最长边超过绝对上限时抛错。
 */
export function validateImageDimension(width: number, height: number): void {
  const longest = Math.max(width, height);

  if (longest > OCR_MAX_DIMENSION) {
    throw new Error(
      `图片尺寸过大（最长边 ${longest}px，上限 ${OCR_MAX_DIMENSION}px），请缩小图片后再上传。`,
    );
  }
}

/**
 * 计算识别前的缩放比例：把最长边缩到 OCR_WORK_DIMENSION 以内，
 * 返回值 ∈ (0, 1]，小图原样使用（返回 1）。
 */
export function computeOcrScale(width: number, height: number): number {
  const longest = Math.max(width || 1, height || 1);

  return Math.min(1, OCR_WORK_DIMENSION / longest);
}

/* ------------------------------------------------------------------ *
 * run：工具的纯函数入口（契约要求，供测试与统一调度）
 * ------------------------------------------------------------------ */

export type OcrRunInput = {
  language?: OcrLanguage;
};

export type OcrRunResult = {
  id: OcrLanguage;
  label: string;
  lang: string;
};

/**
 * 图片文字识别工具的唯一纯函数入口。输入 `{ language? }`，
 * 返回归一化后的语言配置 `{ id, label, lang }`。
 *
 * 注意：真正的 OCR 识别是异步的（依赖 tesseract.js），不在本模块内完成；
 * 本入口只承载可同步、可测试的「语言配置归一化」这一纯函数职责。
 */
export function runImageOcr(input: unknown): OcrRunResult {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("图片文字识别需要选择识别语言。");
  }

  const record = input as Record<string, unknown>;
  const option = normalizeOcrLanguage(record.language);

  return { id: option.id, label: option.label, lang: option.lang };
}
