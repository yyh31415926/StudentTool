"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  computeOcrScale,
  normalizeOcrLanguage,
  resolveImageType,
  validateImageDimension,
  validateImageMeta,
  OCR_DEFAULT_LANGUAGE,
  OCR_LANGUAGE_OPTIONS,
  type OcrLanguage,
} from "@/lib/tools/image-ocr";

type OcrStatus = "idle" | "loading" | "done" | "error";
type CopyState = "idle" | "copied" | "error";

type ImageOcrToolProps = {
  emptyHint?: string;
  errorHint?: string;
};

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("图片加载失败，请换一张图片重试。"));
    image.src = url;
  });

  return image;
}

/**
 * 图片文字识别：选择 / 拖拽 / 粘贴图片 → 选择语言 → 本地识别 → 复制结果。
 *
 * 图片只在浏览器本地处理，不上传、不保存；tesseract.js 识别引擎按需懒加载，
 * 首次识别会从 CDN 下载对应语言的模型（图片本身不出浏览器）。
 */
export function ImageOcrTool({ emptyHint, errorHint }: ImageOcrToolProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<OcrLanguage>(OCR_DEFAULT_LANGUAGE);
  const [result, setResult] = useState("");
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
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

  function resetResult() {
    setResult("");
    setError(undefined);
    setProgress(0);
    setCopyState("idle");
  }

  function processFile(file: File) {
    releaseObjectUrl();
    setImageUrl(null);
    resetResult();

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
    setStatus("idle");
  }

  async function recognizeImage() {
    if (!imageUrl) {
      return;
    }

    setStatus("loading");
    setError(undefined);
    setProgress(0);
    setCopyState("idle");

    try {
      const { createWorker } = await import("tesseract.js");
      const option = normalizeOcrLanguage(language);

      const image = await loadImageElement(imageUrl);
      const width = image.naturalWidth || 1;
      const height = image.naturalHeight || 1;
      validateImageDimension(width, height);

      const scale = computeOcrScale(width, height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("无法创建画布，请换一张图片重试。");
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const worker = await createWorker(option.lang, undefined, {
        logger: (message) => {
          if (typeof message.progress === "number") {
            setProgress(message.progress);
          }
        },
      });

      try {
        const { data } = await worker.recognize(canvas);
        setResult(data.text.trim());
        setStatus("done");
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : (errorHint ?? "识别失败，请重试。"),
      );
    }
  }

  function clearImage() {
    releaseObjectUrl();
    setImageUrl(null);
    setLanguage(OCR_DEFAULT_LANGUAGE);
    resetResult();
    setStatus("idle");

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

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 输入区 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">上传图片</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 PNG、JPG/JPEG、WebP，单张不超过 10MB；图片只在本地处理，不会上传。
          </p>
        </div>

        <div
          tabIndex={0}
          role="button"
          aria-label="上传要识别的图片"
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
              alt="上传的图片预览"
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

        <div className="space-y-2">
          <label
            htmlFor="ocr-language"
            className="block text-sm font-medium text-foreground"
          >
            识别语言
          </label>
          <Select
            id="ocr-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as OcrLanguage)}
          >
            {OCR_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-sm text-muted-foreground">
            首次识别会下载对应语言的模型，之后会自动缓存、速度更快。
          </p>
        </div>

        <Button
          type="button"
          disabled={!imageUrl || status === "loading"}
          onClick={recognizeImage}
        >
          {status === "loading" ? "正在识别…" : "识别文字"}
        </Button>

        {status === "loading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            正在识别文字…
            {progressPercent > 0 ? ` ${progressPercent}%` : ""}
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
            识别出的文字会显示在下方，可手动选择并复制。
          </p>
        </div>

        <pre
          aria-live="polite"
          className="min-h-64 whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 font-mono text-sm"
        >
          {result || (imageUrl ? "—" : (emptyHint ?? "—"))}
        </pre>

        {status === "done" && result ? (
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
        ) : null}
      </div>
    </div>
  );
}
