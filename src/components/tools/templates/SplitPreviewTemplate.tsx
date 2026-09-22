"use client";

import { useState } from "react";
import { getToolById } from "@/lib/tools/registry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type SplitPreviewTemplateProps = {
  toolId: string;
  exampleInput: string;
  emptyHint?: string;
  errorHint?: string;
};

function formatPreview(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  return typeof value === "object"
    ? JSON.stringify(value, null, 2)
    : String(value);
}

export function SplitPreviewTemplate({
  toolId,
  exampleInput,
  emptyHint,
  errorHint,
}: SplitPreviewTemplateProps) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | undefined>();
  const tool = getToolById(toolId);

  function updatePreview(nextInput: string) {
    setInput(nextInput);

    if (!nextInput.trim()) {
      setPreview("");
      setError(emptyHint);
      return;
    }

    if (!tool) {
      setPreview("");
      setError("工具暂不可用。");
      return;
    }

    try {
      setPreview(formatPreview(tool.run(nextInput)));
      setError(undefined);
    } catch (caughtError) {
      setPreview("");
      setError(
        errorHint ??
          (caughtError instanceof Error ? caughtError.message : "输入无法预览。"),
      );
    }
  }

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">输入与预览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            左侧输入，右侧查看工具生成的预览结果。
          </p>
        </div>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => updatePreview(exampleInput)}
        >
          试试示例
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          aria-label="输入预览内容"
          value={input}
          onChange={(event) => updatePreview(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              updatePreview("");
            }
          }}
          placeholder="在这里输入内容"
        />
        <pre
          aria-live="polite"
          className="min-h-48 whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 text-sm"
        >
          {preview || "—"}
        </pre>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
