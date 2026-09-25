"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type QRCodeDownloadActionsProps = {
  svg: string;
  size: number;
  hasContent: boolean;
  onClear: () => void;
};

type CopyState = "idle" | "copied" | "error";

/**
 * 把 SVG 字符串栅格化为 PNG Blob。二维码 SVG 只含矩形 / 圆形，无字体，
 * 可以稳定地画到 canvas 上再导出 PNG。
 */
async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("二维码预览加载失败"));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("无法创建画布");
    }

    context.drawImage(image, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("PNG 导出失败"));
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 生成结果的四个操作：复制图片、下载 PNG、下载 SVG、清空。
 */
export function QRCodeDownloadActions({
  svg,
  size,
  hasContent,
  onClear,
}: QRCodeDownloadActionsProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyImage() {
    if (!hasContent) {
      return;
    }

    setCopyState("idle");

    try {
      const blob = await svgToPngBlob(svg, size);

      if (
        typeof ClipboardItem === "undefined" ||
        !navigator.clipboard?.write
      ) {
        throw new Error("unsupported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function downloadPng() {
    if (!hasContent) {
      return;
    }

    try {
      const blob = await svgToPngBlob(svg, size);
      downloadBlob(blob, "qrcode.png");
    } catch {
      setCopyState("error");
    }
  }

  function downloadSvg() {
    if (!hasContent) {
      return;
    }

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, "qrcode.svg");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          type="button"
          variant="secondary"
          disabled={!hasContent}
          onClick={copyImage}
        >
          复制二维码图片
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          disabled={!hasContent}
          onClick={downloadPng}
        >
          下载 PNG
        </Button>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          disabled={!hasContent}
          onClick={downloadSvg}
        >
          下载 SVG
        </Button>
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={!hasContent}
          onClick={onClear}
        >
          清空
        </Button>
      </div>

      {copyState === "copied" ? (
        <p className="text-sm text-muted-foreground" role="status">
          二维码图片已复制到剪贴板。
        </p>
      ) : null}
      {copyState === "error" ? (
        <p className="text-sm text-error" role="alert">
          操作失败：浏览器可能不支持复制图片，请改用「下载 PNG」。
        </p>
      ) : null}
    </div>
  );
}
