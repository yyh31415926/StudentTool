"use client";

import { useMemo, useState } from "react";
import { useToolUsage } from "../../ToolUsageBoundary";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  buildQrMatrix,
  buildQrSvg,
  contrastRatio,
  hasSufficientContrast,
  QR_DEFAULT_OPTIONS,
  validateQrInput,
  type QrEncodeOptions,
} from "@/lib/tools/qrcode";
import { QRCodeDownloadActions } from "./QRCodeDownloadActions";
import { QRCodeStyleControls } from "./QRCodeStyleControls";

type QRCodeEncodePanelProps = {
  exampleInput: string;
  emptyHint?: string;
};

/**
 * 内容转二维码：输入文字 → 实时生成预览 → 复制 / 下载。
 *
 * 生成只调用纯函数（校验、矩阵、SVG），全部在浏览器本地完成，不上传内容。
 */
export function QRCodeEncodePanel({
  exampleInput,
  emptyHint,
}: QRCodeEncodePanelProps) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<QrEncodeOptions>({
    ...QR_DEFAULT_OPTIONS,
  });

  const hasContent = text.trim().length > 0;
  const contrastOk = hasSufficientContrast(
    options.foreground,
    options.background,
  );
  const ratio = contrastRatio(options.foreground, options.background);

  const { svg, error } = useMemo(() => {
    if (!hasContent) {
      return { svg: "", error: undefined };
    }

    try {
      validateQrInput(text);
      const matrix = buildQrMatrix(text, options.errorCorrectionLevel);
      return { svg: buildQrSvg(matrix, options), error: undefined };
    } catch (caught) {
      return {
        svg: "",
        error: caught instanceof Error ? caught.message : "生成失败。",
      };
    }
  }, [text, options, hasContent]);
  useToolUsage(Boolean(svg));

  const previewUrl = useMemo(
    () => (svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : ""),
    [svg],
  );

  function clearInput() {
    setText("");
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 输入区 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">输入内容</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            输入文字、网址、中文或 Emoji，右侧实时生成二维码预览。
          </p>
        </div>

        <Textarea
          aria-label="输入要生成二维码的内容"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              clearInput();
            }
          }}
          placeholder="在这里输入或粘贴内容"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => setText(exampleInput)}
          >
            试试示例
          </Button>
          <Button
            size="sm"
            type="button"
            variant="secondary"
            disabled={!hasContent}
            onClick={clearInput}
          >
            清空
          </Button>
        </div>

        <QRCodeStyleControls options={options} onChange={setOptions} />
      </div>

      {/* 预览区 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">预览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            默认黑白样式可直接扫描，四周保留静区。
          </p>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-64 items-center justify-center rounded-control bg-surface-muted p-4"
        >
          {previewUrl ? (
            // 客户端生成的 data URL 预览，next/image 无法优化，使用原生 img。
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="二维码预览"
              className="h-auto w-full max-w-72"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {error ?? emptyHint ?? "输入内容后生成二维码预览。"}
            </p>
          )}
        </div>

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        {hasContent && !contrastOk ? (
          <p className="text-sm text-error" role="alert">
            前景色与背景色对比度不足（当前 {ratio.toFixed(1)}:1），二维码可能无法被扫描。请加深前景色或提亮背景色。
          </p>
        ) : null}

        <QRCodeDownloadActions
          svg={svg}
          size={options.size}
          hasContent={hasContent && !error}
          onClear={clearInput}
        />
      </div>
    </div>
  );
}
