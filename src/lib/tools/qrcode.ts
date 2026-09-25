/**
 * 二维码工具的纯函数核心。
 *
 * 不依赖 React，不读写任何外部状态：同样的输入永远得到同样的输出。
 *
 * 职责边界：
 * - 编码侧：只借用 `qrcode` 库生成位矩阵（不自己实现二维码编码算法），
 *   渲染（方形 / 圆点 / 圆角、静区、前景 / 背景色）在这里用纯字符串拼出 SVG。
 * - 解码侧：只提供图片类型 / 大小的校验；真正的解码（jsQR）依赖像素数据，
 *   放在客户端组件里做懒加载，不进入本模块，避免把它打进服务端 bundle。
 *
 * 对比度提示：二维码能否被扫到，最关键是前景 / 背景的明暗对比。
 * 这里用 WCAG 对比度公式计算，低于阈值时由界面给出提示。
 */

import QRCode from "qrcode";

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

/** 二维码内容长度上限（按 UTF-16 码元计）。超过后二维码会过密、难扫。 */
export const QR_MAX_INPUT_LENGTH = 1000;

/** 生成图片的默认边长（像素）。 */
export const QR_DEFAULT_SIZE = 256;

/** 二维码四周静区（空白边距），按模块数计。规范要求 ≥ 4。 */
export const QR_QUIET_ZONE_MODULES = 4;

/** 前景 / 背景对比度低于该阈值时，界面提示"可能无法扫描"。 */
export const QR_CONTRAST_THRESHOLD = 4.5;

/** 识别上传图片的大小上限：5MB。 */
export const QR_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** 允许上传的图片 MIME 类型。 */
export const QR_SUPPORTED_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QrDotStyle = "square" | "dots" | "rounded";

export type QrEncodeOptions = {
  /** 输出图片边长（像素）。 */
  size: number;
  /** 前景（深色）颜色，十六进制。 */
  foreground: string;
  /** 背景（浅色）颜色，十六进制。 */
  background: string;
  errorCorrectionLevel: QrErrorCorrectionLevel;
  dotStyle: QrDotStyle;
};

/** 二维码位矩阵：`data` 为行优先的 0 / 1 数组，长度为 size × size。 */
export type QrMatrix = {
  size: number;
  data: number[];
};

export const QR_DEFAULT_OPTIONS: QrEncodeOptions = {
  size: QR_DEFAULT_SIZE,
  foreground: "#000000",
  background: "#ffffff",
  errorCorrectionLevel: "M",
  dotStyle: "square",
};

const EC_LEVELS: readonly QrErrorCorrectionLevel[] = ["L", "M", "Q", "H"];
const DOT_STYLES: readonly QrDotStyle[] = ["square", "dots", "rounded"];

/* ------------------------------------------------------------------ *
 * 输入校验
 * ------------------------------------------------------------------ */

/**
 * 校验并返回二维码内容。空 / 纯空白 / 超长会抛错。
 */
export function validateQrInput(text: unknown): string {
  if (typeof text !== "string") {
    throw new TypeError("二维码工具只接受文本输入。请输入文字、网址等内容。");
  }

  if (text.length > QR_MAX_INPUT_LENGTH) {
    throw new Error(
      `内容过长（超过 ${QR_MAX_INPUT_LENGTH} 个字符），二维码会过密而难以扫描。请缩短内容。`,
    );
  }

  if (!text.trim()) {
    throw new Error("请输入要生成二维码的内容；空内容无法生成。");
  }

  return text;
}

function isErrorCorrectionLevel(value: unknown): value is QrErrorCorrectionLevel {
  return typeof value === "string" && (EC_LEVELS as readonly string[]).includes(value);
}

function isDotStyle(value: unknown): value is QrDotStyle {
  return typeof value === "string" && (DOT_STYLES as readonly string[]).includes(value);
}

/**
 * 归一化生成选项，未提供的字段取默认值，非法值抛错。
 */
export function normalizeQrOptions(
  partial: Partial<QrEncodeOptions> = {},
): QrEncodeOptions {
  const size = partial.size ?? QR_DEFAULT_OPTIONS.size;

  if (!Number.isInteger(size) || size < 64 || size > 1024) {
    throw new Error("尺寸需为 64 到 1024 之间的整数（像素）。");
  }

  const foreground = partial.foreground
    ? parseHexColor(partial.foreground)
    : QR_DEFAULT_OPTIONS.foreground;
  const background = partial.background
    ? parseHexColor(partial.background)
    : QR_DEFAULT_OPTIONS.background;

  const errorCorrectionLevel =
    partial.errorCorrectionLevel ?? QR_DEFAULT_OPTIONS.errorCorrectionLevel;

  if (!isErrorCorrectionLevel(errorCorrectionLevel)) {
    throw new Error("纠错等级只能是 L、M、Q、H 之一。");
  }

  const dotStyle = partial.dotStyle ?? QR_DEFAULT_OPTIONS.dotStyle;

  if (!isDotStyle(dotStyle)) {
    throw new Error("模块样式只能是方形、圆点或圆角。");
  }

  return { size, foreground, background, errorCorrectionLevel, dotStyle };
}

/* ------------------------------------------------------------------ *
 * 颜色与对比度
 * ------------------------------------------------------------------ */

/**
 * 校验并归一化十六进制颜色：支持 #RGB 与 #RRGGBB，统一返回小写 #RRGGBB。
 */
export function parseHexColor(value: string): string {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];

    return `#${r}${r}${g}${g}${b}${b}`;
  }

  throw new Error("颜色格式不正确，请使用 #RRGGBB 格式（例如 #000000）。");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function channelLuminance(channel: number): number {
  const normalized = channel / 255;

  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/**
 * 计算两个十六进制颜色的 WCAG 对比度（1 ~ 21）。
 */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 前景 / 背景对比度是否足够（≥ QR_CONTRAST_THRESHOLD）。
 */
export function hasSufficientContrast(
  foreground: string,
  background: string,
): boolean {
  return contrastRatio(foreground, background) >= QR_CONTRAST_THRESHOLD;
}

/* ------------------------------------------------------------------ *
 * 图片（解码侧）校验
 * ------------------------------------------------------------------ */

export function isSupportedImageType(type: string): boolean {
  return QR_SUPPORTED_IMAGE_TYPES.includes(type.toLowerCase());
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

  if (meta.size > QR_IMAGE_MAX_BYTES) {
    throw new Error("图片大小超过 5MB，请压缩图片后再上传。");
  }
}

/* ------------------------------------------------------------------ *
 * 矩阵与 SVG 生成
 * ------------------------------------------------------------------ */

/**
 * 用 `qrcode` 库生成二维码位矩阵（同步、纯函数）。
 * 中文与 Emoji 由库按 UTF-8 处理。
 */
export function buildQrMatrix(
  text: string,
  errorCorrectionLevel: QrErrorCorrectionLevel,
): QrMatrix {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel });

    return {
      size: qr.modules.size,
      data: Array.from(qr.modules.data),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (/too big|amount of data/i.test(message)) {
      throw new Error(
        "内容过长，无法在所选纠错等级下生成二维码。请降低纠错等级（如 L）或缩短内容。",
      );
    }

    throw new Error(`二维码生成失败：${message || "未知错误"}`);
  }
}

/** 三个角上的定位图案（7×7 区域）必须保持方形，否则影响扫描。 */
function isFinderZone(row: number, col: number, size: number): boolean {
  const inTopLeft = row < 7 && col < 7;
  const inTopRight = row < 7 && col >= size - 7;
  const inBottomLeft = row >= size - 7 && col < 7;

  return inTopLeft || inTopRight || inBottomLeft;
}

/**
 * 把位矩阵渲染为 SVG 字符串（纯函数）。
 *
 * 四周带静区；定位图案固定为方形，其余模块按 dotStyle 渲染。
 * 输出只依赖输入，便于测试与 SVG 下载 / 栅格化为 PNG。
 */
export function buildQrSvg(matrix: QrMatrix, options: QrEncodeOptions): string {
  const margin = QR_QUIET_ZONE_MODULES;
  const dimension = matrix.size + margin * 2;
  const isCrisp = options.dotStyle === "square";
  const shapeRendering = isCrisp ? ' shape-rendering="crispEdges"' : "";
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${dimension} ${dimension}"${shapeRendering}>`,
  );
  parts.push(
    `<rect x="0" y="0" width="${dimension}" height="${dimension}" fill="${options.background}"/>`,
  );

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.data[row * matrix.size + col] !== 1) {
        continue;
      }

      const x = col + margin;
      const y = row + margin;

      if (options.dotStyle === "square" || isFinderZone(row, col, matrix.size)) {
        parts.push(
          `<rect x="${x}" y="${y}" width="1" height="1" fill="${options.foreground}"/>`,
        );
      } else if (options.dotStyle === "dots") {
        parts.push(
          `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.45" fill="${options.foreground}"/>`,
        );
      } else {
        parts.push(
          `<rect x="${x + 0.1}" y="${y + 0.1}" width="0.8" height="0.8" rx="0.28" fill="${options.foreground}"/>`,
        );
      }
    }
  }

  parts.push("</svg>");

  return parts.join("");
}

/* ------------------------------------------------------------------ *
 * run：工具的纯函数入口（契约要求，供测试与统一调度）
 * ------------------------------------------------------------------ */

export type QrEncodeInput = {
  text: string;
  size?: number;
  foreground?: string;
  background?: string;
  errorCorrectionLevel?: QrErrorCorrectionLevel;
  dotStyle?: QrDotStyle;
};

/**
 * 二维码工具的唯一入口。输入 `{ text, ...生成选项 }`，返回 SVG 字符串。
 */
export function runQrEncode(input: unknown): string {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("二维码工具需要同时提供文本与生成选项。");
  }

  const record = input as Record<string, unknown>;
  const text = validateQrInput(record.text);

  const options = normalizeQrOptions({
    size: typeof record.size === "number" ? record.size : undefined,
    foreground:
      typeof record.foreground === "string" ? record.foreground : undefined,
    background:
      typeof record.background === "string" ? record.background : undefined,
    errorCorrectionLevel: isErrorCorrectionLevel(record.errorCorrectionLevel)
      ? record.errorCorrectionLevel
      : undefined,
    dotStyle: isDotStyle(record.dotStyle) ? record.dotStyle : undefined,
  });

  const matrix = buildQrMatrix(text, options.errorCorrectionLevel);

  return buildQrSvg(matrix, options);
}
