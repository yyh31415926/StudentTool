/**
 * DeepSeek 视觉识别（OCR）的服务端封装。
 *
 * ⚠️ 本模块只在服务端（Next.js Route Handler）被引用，绝不能被客户端代码导入，
 * 从而保证 DEEPSEEK_API_KEY 只存在于服务端环境变量中，不会进入浏览器 bundle。
 *
 * 职责边界：
 * - 从 process.env 读取 DEEPSEEK_API_KEY（只用 DEEPSEEK_API_KEY，绝不用 NEXT_PUBLIC_ 前缀）
 * - 校验图片 Data URL 的类型与大小（复用工具层的共享常量，避免两处口径漂移）
 * - 调用 DeepSeek 官方视觉模型 deepseek-flash 完成 OCR
 * - 只提取并返回纯文本；不保存图片、不保存结果、不向用户泄露上游错误细节
 */

import {
  isSupportedImageType,
  OCR_IMAGE_MAX_BYTES,
} from "@/lib/tools/image-ocr";

/** DeepSeek 官方当前支持图片输入的模型 ID（DeepSeek-V4.1-Flash）。 */
export const DEEPSEEK_MODEL = "deepseek-flash";

/** DeepSeek Chat Completions 端点（OpenAI 兼容）。 */
export const DEEPSEEK_API_ENDPOINT = "https://api.deepseek.com/chat/completions";

/** 服务端调用 DeepSeek 的超时（毫秒）。略小于前端总超时，保证超时响应能先返回给前端。 */
export const DEEPSEEK_TIMEOUT_MS = 55_000;

/** 请求体上限：10MB 图片经 base64 后约 13.4MB，此处留余量做早期拒绝。 */
export const DEEPSEEK_MAX_REQUEST_BYTES = 14 * 1024 * 1024;

/** 发给模型的 OCR 提示词：只返回文字、保留结构、无法确认的字符用 [无法识别]。 */
export const OCR_PROMPT = [
  "请准确识别图片中的所有文字。",
  "只返回识别到的文字，不要总结、解释、翻译或添加额外内容。",
  "尽量保留原始换行、段落和列表结构。",
  "如果某个字符无法确认，请使用 [无法识别] 标记。",
].join("\n");

/**
 * 带状态码的服务端错误。用于把服务端错误转成面向用户的、克制的响应，
 * 不携带任何上游请求头、密钥或完整错误体。
 */
export class DeepSeekError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "DeepSeekError";
    this.status = status;
    this.code = code;
  }
}

/**
 * 读取服务端环境变量中的 API Key。
 *
 * 用方括号访问而非 `process.env.DEEPSEEK_API_KEY`，是为了避免 Next.js 在构建期
 * 内联该值——这样用户在运行时配置 .env.local 也能生效，且绝不会被暴露到前端。
 */
function readApiKey(): string | undefined {
  const key = process.env["DEEPSEEK_API_KEY"] as string | undefined;

  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export function isDeepSeekConfigured(): boolean {
  return readApiKey() !== undefined;
}

/** 解析 data URL，返回 { mimeType, base64 }。非法则抛 400。 */
export function parseDataUrl(dataUrl: unknown): {
  mimeType: string;
  base64: string;
} {
  if (typeof dataUrl !== "string") {
    throw new DeepSeekError("请求格式不正确，缺少图片数据。", 400);
  }

  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(
    dataUrl,
  );

  if (!match) {
    throw new DeepSeekError("图片数据格式不正确。", 400);
  }

  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}

/**
 * 校验并归一化图片 Data URL：类型必须是 PNG/JPG/JPEG/WebP，大小 ≤ 10MB，
 * 内容不能为空。返回可安全交给 DeepSeek 的完整 Data URL。
 */
export function normalizeImageDataUrl(dataUrl: unknown): string {
  const { mimeType, base64 } = parseDataUrl(dataUrl);

  if (!isSupportedImageType(mimeType)) {
    throw new DeepSeekError(
      "不支持的图片格式，请上传 PNG、JPG/JPEG 或 WebP 图片。",
      415,
    );
  }

  const clean = base64.replace(/\s/g, "");

  if (!clean) {
    throw new DeepSeekError("图片内容为空，请重新选择图片。", 400);
  }

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((clean.length * 3) / 4) - padding;

  if (byteLength > OCR_IMAGE_MAX_BYTES) {
    throw new DeepSeekError("图片大小超过 10MB，请压缩图片后再上传。", 413);
  }

  return `data:${mimeType};base64,${clean}`;
}

/** 从 DeepSeek 响应中提取纯文本；结构异常抛 502。 */
export function extractText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new DeepSeekError("DeepSeek 返回了无法解析的结果。", 502);
  }

  const choices = (payload as Record<string, unknown>).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new DeepSeekError("DeepSeek 未返回识别结果。", 502);
  }

  const first = choices[0] as Record<string, unknown>;
  const message = first?.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (typeof content !== "string") {
    throw new DeepSeekError("DeepSeek 返回内容为空。", 502);
  }

  return content;
}

/**
 * 调用 DeepSeek 视觉模型完成 OCR，返回纯文本。
 *
 * 图片以 base64 Data URL 内联发送（不写磁盘、不落存储）；只在内存中完成。
 * 失败时按状态码给出克制的、面向用户的中文提示，不泄露上游响应体与密钥。
 */
export async function callDeepSeekOcr(dataUrl: string): Promise<string> {
  const apiKey = readApiKey();

  if (!apiKey) {
    throw new DeepSeekError(
      "管理员尚未配置 DeepSeek API Key，暂时无法使用 DeepSeek 识别。",
      503,
      "NOT_CONFIGURED",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(DEEPSEEK_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: OCR_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status;

      if (status === 401 || status === 403) {
        throw new DeepSeekError(
          "DeepSeek API Key 无效或没有权限，请检查服务端配置。",
          502,
        );
      }

      if (status === 429) {
        throw new DeepSeekError("DeepSeek 请求过于频繁，请稍后重试。", 502);
      }

      if (status >= 500) {
        throw new DeepSeekError(
          "DeepSeek 服务暂时不可用，请稍后重试。",
          502,
        );
      }

      throw new DeepSeekError(
        `DeepSeek 拒绝了请求（${status}），请检查图片后重试。`,
        502,
      );
    }

    const payload: unknown = await response.json();

    return extractText(payload);
  } catch (error) {
    if (error instanceof DeepSeekError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new DeepSeekError("DeepSeek 识别超时，请稍后重试。", 504);
    }

    throw new DeepSeekError("无法连接 DeepSeek 服务，请稍后重试。", 502);
  } finally {
    clearTimeout(timer);
  }
}
