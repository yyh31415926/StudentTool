import { NextResponse } from "next/server";
import {
  callDeepSeekOcr,
  DEEPSEEK_MAX_REQUEST_BYTES,
  DeepSeekError,
  isDeepSeekConfigured,
  normalizeImageDataUrl,
} from "@/lib/ocr/deepseek";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 检查 DeepSeek 是否已配置。
 * 只返回布尔值，绝不返回密钥内容或密钥是否存在之外的信息。
 */
export async function GET() {
  return NextResponse.json({ configured: isDeepSeekConfigured() });
}

/**
 * 图片文字识别的 DeepSeek 模式入口。
 *
 * 职责：接收图片 → 校验类型/大小 → 调用 DeepSeek → 只返回识别文本。
 * 不写磁盘、不保存图片、不保存识别结果、不泄露密钥与上游错误细节。
 */
export async function POST(request: Request) {
  // 1. 早期拒绝过大请求（10MB 图片 base64 后约 13.4MB）。
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);

    if (Number.isFinite(parsed) && parsed > DEEPSEEK_MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "图片过大，请上传 10MB 以内的图片。" },
        { status: 413 },
      );
    }
  }

  // 2. 解析 JSON 请求体。
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式不正确。" }, { status: 400 });
  }

  // 3. 校验图片（类型 / 大小 / 非空）。
  const image = (body as Record<string, unknown>)?.image;
  let dataUrl: string;

  try {
    dataUrl = normalizeImageDataUrl(image);
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "图片校验失败。" }, { status: 400 });
  }

  // 4. 调用 DeepSeek，返回纯文本。
  try {
    const text = await callDeepSeekOcr(dataUrl);

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof DeepSeekError) {
      return NextResponse.json(
        { error: error.message, ...(error.code ? { code: error.code } : {}) },
        { status: error.status },
      );
    }

    // 意外错误：只记录到服务端日志，不把堆栈/细节暴露给用户。
    console.error("[ocr/deepseek] unexpected error:", error);

    return NextResponse.json(
      { error: "识别服务暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}
