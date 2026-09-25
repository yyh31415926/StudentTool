"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  resolveImageType,
  validateImageMeta,
} from "@/lib/tools/qrcode";

type DecodeStatus = "idle" | "loading" | "decoded" | "error";
type CopyState = "idle" | "copied" | "error";

/** 缩小图片的最大长边，避免大图让 jsQR 占用过多内存。 */
const MAX_DECODE_DIMENSION = 1600;

type DecodeResult = { data: string } | null;
type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: string },
) => DecodeResult | null;

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = url;
  });

  return image;
}

/**
 * 把图片画到 canvas 上并用 jsQR 解码，返回解码文本；未识别返回 null。
 * jsQR 只在这里按需动态加载，进入编码模式时不会被下载。
 */
async function decodeQrFromImage(
  url: string,
  jsQR: JsQrFn,
): Promise<string | null> {
  const image = await loadImageElement(url);
  const naturalWidth = image.naturalWidth || 1;
  const naturalHeight = image.naturalHeight || 1;
  const scale = Math.min(1, MAX_DECODE_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("无法创建画布");
  }

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  return code ? code.data : null;
}

/**
 * 二维码转内容：上传 / 拖拽 / 粘贴图片 → 本地识别 → 输出结果。
 * 图片只在浏览器本地处理，不上传、不保存；识别完成后释放临时 Object URL。
 */
export function QRCodeDecodePanel() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<DecodeStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [isDragging, setIsDragging] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => releaseObjectUrl();
  }, []);

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function processFile(file: File) {
    releaseObjectUrl();
    setImageUrl(null);
    setResult("");
    setError(undefined);
    setCopyState("idle");

    const type = resolveImageType(file.name, file.type);

    try {
      validateImageMeta({ type, size: file.size });
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "无法处理该图片。");
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageUrl(url);
    setStatus("loading");

    try {
      const jsQR = (await import("jsqr")).default as JsQrFn;
      const text = await decodeQrFromImage(url, jsQR);

      if (text === null) {
        setStatus("error");
        setError("未识别到二维码。请确认图片清晰、二维码完整且未被遮挡。");
      } else {
        setResult(text);
        setStatus("decoded");
      }
    } catch {
      setStatus("error");
      setError("识别失败，请换一张更清晰的图片重试。");
    }
  }

  function clearImage() {
    releaseObjectUrl();
    setImageUrl(null);
    setResult("");
    setStatus("idle");
    setError(undefined);
    setCopyState("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];

    if (file) {
      processFile(file);
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) =>
      entry.type.startsWith("image/"),
    );
    const file = item?.getAsFile();

    if (file) {
      event.preventDefault();
      processFile(file);
    }
  }

  async function copyResult() {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 上传区 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">上传图片</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 PNG、JPG/JPEG、WebP，单张不超过 5MB；图片只在本地处理。
          </p>
        </div>

        <div
          tabIndex={0}
          role="button"
          aria-label="上传二维码图片"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onPaste={onPaste}
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed p-6 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            isDragging
              ? "border-primary bg-surface-muted"
              : "border-border bg-surface"
          }`}
        >
          {imageUrl ? (
            // 对象 URL 预览，next/image 无法优化，使用原生 img。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="上传的二维码图片预览"
              className="max-h-56 max-w-full rounded"
            />
          ) : (
            <>
              <p className="text-sm font-medium">点击或拖拽图片到此处</p>
              <p className="text-sm text-muted-foreground">
                也可以直接把图片粘贴进来（Ctrl+V）
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              processFile(file);
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            选择图片
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            disabled={!imageUrl}
            onClick={clearImage}
          >
            清空
          </Button>
        </div>

        {status === "loading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            正在识别二维码…
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {/* 输出区 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">识别结果</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            识别出的内容会显示在下方，可手动选择并复制。
          </p>
        </div>

        <pre
          aria-live="polite"
          className="min-h-32 whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 font-mono text-sm"
        >
          {result || "—"}
        </pre>

        {status === "decoded" ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                type="button"
                variant="secondary"
                onClick={copyResult}
              >
                复制识别结果
              </Button>
              {copyState === "copied" ? (
                <span className="text-sm text-muted-foreground" role="status">
                  已复制。
                </span>
              ) : null}
              {copyState === "error" ? (
                <span className="text-sm text-error" role="alert">
                  复制失败，请手动复制。
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              若图片包含多个二维码，本工具识别检测到的第一个。
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
