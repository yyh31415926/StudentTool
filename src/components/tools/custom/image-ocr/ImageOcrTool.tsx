"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

type OcrMode = "local" | "deepseek";
type LocalStatus = "idle" | "loading" | "done" | "error";
type DeepSeekStatus =
  | "idle"
  | "uploading"
  | "recognizing"
  | "success"
  | "empty"
  | "not-configured"
  | "timeout"
  | "network-error"
  | "api-error";
type CopyState = "idle" | "copied" | "error";

type ImageOcrToolProps = {
  emptyHint?: string;
  errorHint?: string;
};

const DEEPSEEK_TIMEOUT_MS = 60_000;
const UPLOAD_PHASE_MS = 1200;
const DEEPSEEK_NOT_CONFIGURED =
  "管理员尚未配置 DeepSeek API Key，暂时无法使用 DeepSeek 识别。请改用本地识别。";

const MODES: readonly { id: OcrMode; label: string }[] = [
  { id: "local", label: "本地识别" },
  { id: "deepseek", label: "DeepSeek 识别" },
];

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("读取图片失败，请重试。"));
    reader.readAsDataURL(file);
  });
}

/**
 * 图片文字识别：本地识别（tesseract）或 DeepSeek 识别（服务端代理）。
 *
 * 默认本地识别，图片不出浏览器；只有用户主动切到「DeepSeek 识别」后，
 * 图片才会被发送到服务端并由服务端调用 DeepSeek API。切换模式不丢失图片、
 * 不自动开始识别；识别失败时保留原有输出文本。
 */
export function ImageOcrTool({ emptyHint, errorHint }: ImageOcrToolProps) {
  const [mode, setMode] = useState<OcrMode>("local");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<OcrLanguage>(OCR_DEFAULT_LANGUAGE);
  const [result, setResult] = useState("");
  const [localStatus, setLocalStatus] = useState<LocalStatus>("idle");
  const [deepseekStatus, setDeepseekStatus] = useState<DeepSeekStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [deepseekConfigured, setDeepseekConfigured] = useState<boolean | null>(
    null,
  );

  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timedOutRef = useRef(false);

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function cancelDeepseek() {
    abortRef.current?.abort();
    abortRef.current = null;
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

  // 挂载后检查 DeepSeek 是否已配置（不返回密钥，仅布尔值）。
  useEffect(() => {
    let active = true;

    fetch("/api/ocr/deepseek")
      .then((response) => response.json())
      .then((data: unknown) => {
        if (active) {
          setDeepseekConfigured(Boolean((data as { configured?: boolean })?.configured));
        }
      })
      .catch(() => {
        // 状态获取失败则保持未知，交由识别时的错误提示兜底。
      });

    return () => {
      active = false;
    };
  }, []);

  function processFile(file: File) {
    cancelDeepseek();
    releaseObjectUrl();
    fileRef.current = null;
    setImageUrl(null);
    setResult("");
    setError(undefined);
    setProgress(0);
    setCopyState("idle");
    setLocalStatus("idle");
    setDeepseekStatus("idle");

    const type = resolveImageType(file.name, file.type);

    try {
      validateImageMeta({ type, size: file.size });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法处理该图片。");
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    fileRef.current = file;
    setImageUrl(url);
  }

  function switchMode(next: OcrMode) {
    if (next === mode) {
      return;
    }

    cancelDeepseek();
    setMode(next);
    setError(undefined);
    setProgress(0);
    setCopyState("idle");
    setLocalStatus("idle");
    setDeepseekStatus("idle");
    // 保留已上传图片与已识别结果，不自动开始识别。
  }

  function confirmOverwrite(): boolean {
    if (result.length === 0) {
      return true;
    }

    return window.confirm("当前已有识别结果，重新识别将覆盖它。是否继续？");
  }

  async function recognizeLocal() {
    if (!imageUrl) {
      return;
    }

    if (!confirmOverwrite()) {
      return;
    }

    setLocalStatus("loading");
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
        setLocalStatus("done");
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      setLocalStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : (errorHint ?? "识别失败，请重试。"),
      );
    }
  }

  async function recognizeDeepseek() {
    const file = fileRef.current;

    if (!file || !imageUrl) {
      return;
    }

    if (deepseekStatus === "uploading" || deepseekStatus === "recognizing") {
      return;
    }

    if (!confirmOverwrite()) {
      return;
    }

    timedOutRef.current = false;
    setDeepseekStatus("uploading");
    setError(undefined);
    setCopyState("idle");
    // 不清理 result：请求失败时保留原有输出文本。

    const controller = new AbortController();
    abortRef.current = controller;

    const uploadTimer = window.setTimeout(() => {
      setDeepseekStatus((prev) =>
        prev === "uploading" ? "recognizing" : prev,
      );
    }, UPLOAD_PHASE_MS);

    const timeoutTimer = window.setTimeout(() => {
      timedOutRef.current = true;
      controller.abort();
    }, DEEPSEEK_TIMEOUT_MS);

    try {
      const dataUrl = await fileToDataUrl(file);
      const response = await fetch("/api/ocr/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
        signal: controller.signal,
      });

      let payload: Record<string, unknown> = {};

      try {
        payload = (await response.json()) as Record<string, unknown>;
      } catch {
        // 响应体不是 JSON 时按通用错误处理。
      }

      if (response.status === 503 && payload.code === "NOT_CONFIGURED") {
        setDeepseekStatus("not-configured");
        setError(DEEPSEEK_NOT_CONFIGURED);
        return;
      }

      if (!response.ok) {
        setDeepseekStatus("api-error");
        setError(
          typeof payload.error === "string" && payload.error
            ? payload.error
            : `识别服务返回错误（${response.status}），请稍后重试。`,
        );
        return;
      }

      const text = typeof payload.text === "string" ? payload.text.trim() : "";

      if (!text) {
        setDeepseekStatus("empty");
        setError("未识别到文字，请换一张更清晰的图片，或改用本地识别。");
        return;
      }

      setResult(text);
      setDeepseekStatus("success");
    } catch {
      if (timedOutRef.current) {
        setDeepseekStatus("timeout");
        setError("请求超时，请稍后重试。");
        return;
      }

      if (controller.signal.aborted) {
        // 用户切换模式或清空导致的中止，不显示错误。
        return;
      }

      setDeepseekStatus("network-error");
      setError("网络错误，请检查网络连接后重试。");
    } finally {
      window.clearTimeout(uploadTimer);
      window.clearTimeout(timeoutTimer);

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function clearImage() {
    cancelDeepseek();
    releaseObjectUrl();
    fileRef.current = null;
    setImageUrl(null);
    setLanguage(OCR_DEFAULT_LANGUAGE);
    setResult("");
    setError(undefined);
    setProgress(0);
    setCopyState("idle");
    setLocalStatus("idle");
    setDeepseekStatus("idle");

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
  const localBusy = localStatus === "loading";
  const deepseekBusy =
    deepseekStatus === "uploading" || deepseekStatus === "recognizing";
  const busy = mode === "local" ? localBusy : deepseekBusy;
  const recognizeDisabled =
    !imageUrl || busy || (mode === "deepseek" && deepseekConfigured === false);
  const recognizeLabel =
    mode === "local"
      ? localBusy
        ? "正在识别…"
        : "识别文字"
      : deepseekStatus === "uploading"
        ? "正在上传…"
        : deepseekStatus === "recognizing"
          ? "正在识别…"
          : "识别文字";

  return (
    <Card className="space-y-6">
      {/* 识别方式选择 */}
      <div className="space-y-3">
        <div
          role="radiogroup"
          aria-label="识别方式"
          className="flex rounded-control border border-border bg-surface-muted p-1"
        >
          {MODES.map((item) => {
            const active = mode === item.id;

            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => switchMode(item.id)}
                className={`min-h-touch flex-1 rounded-control px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {mode === "deepseek" ? (
          <div
            role="note"
            className="rounded-control border border-border bg-surface-muted p-3 text-sm text-warning"
          >
            选择 DeepSeek 后，图片会发送到 DeepSeek API。请不要上传不希望离开本机的敏感图片。API 调用可能产生费用。
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            图片仅在当前浏览器中处理，不会上传。
          </p>
        )}

        {mode === "deepseek" && deepseekConfigured === false ? (
          <p className="text-sm text-error" role="alert">
            {DEEPSEEK_NOT_CONFIGURED}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 输入区 */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">上传图片</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              支持 PNG、JPG/JPEG、WebP，单张不超过 10MB。
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

          {mode === "local" ? (
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
                onChange={(event) =>
                  setLanguage(event.target.value as OcrLanguage)
                }
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
          ) : (
            <p className="text-sm text-muted-foreground">
              DeepSeek 会自动识别中英文，无需选择语言。
            </p>
          )}

          <Button
            type="button"
            disabled={recognizeDisabled}
            onClick={mode === "local" ? recognizeLocal : recognizeDeepseek}
          >
            {recognizeLabel}
          </Button>

          {mode === "local" && localBusy ? (
            <p className="text-sm text-muted-foreground" role="status">
              正在识别文字…
              {progressPercent > 0 ? ` ${progressPercent}%` : ""}
            </p>
          ) : null}

          {mode === "deepseek" && deepseekStatus === "uploading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              正在上传图片…
            </p>
          ) : null}

          {mode === "deepseek" && deepseekStatus === "recognizing" ? (
            <p className="text-sm text-muted-foreground" role="status">
              正在识别文字…（DeepSeek 处理中）
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
              识别出的文字会显示在下方，可直接编辑、复制。
            </p>
          </div>

          <textarea
            aria-label="识别结果（可编辑）"
            value={result}
            onChange={(event) => setResult(event.target.value)}
            placeholder={
              imageUrl
                ? "点击「识别文字」后，结果会显示在这里。"
                : (emptyHint ?? "识别结果会显示在这里。")
            }
            className="min-h-64 w-full resize-y rounded-control border border-border bg-surface p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />

          {result ? (
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
    </Card>
  );
}
