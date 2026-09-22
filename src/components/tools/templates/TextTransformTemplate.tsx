"use client";

import { useEffect, useState } from "react";
import { getToolById } from "@/lib/tools/registry";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type TextTransformTemplateProps = {
  toolId: string;
  exampleInput: string;
  emptyHint?: string;
  errorHint?: string;
};

type CopyState = "idle" | "copied" | "error";

function formatOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function TextTransformTemplate({
  toolId,
  exampleInput,
  emptyHint,
  errorHint,
}: TextTransformTemplateProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const tool = getToolById(toolId);

  useEffect(() => {
    if (copyState !== "copied") {
      return;
    }

    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  function runTransform() {
    if (!input.trim()) {
      setOutput("");
      setError(emptyHint ?? "请输入文本后再运行。");
      return;
    }

    if (!tool) {
      setOutput("");
      setError("工具暂不可用。");
      return;
    }

    try {
      setOutput(formatOutput(tool.run(input)));
      setError(undefined);
    } catch (caughtError) {
      setOutput("");
      setError(
        errorHint ??
          (caughtError instanceof Error ? caughtError.message : "输入无法处理。"),
      );
    }
  }

  function clearInput() {
    setInput("");
    setOutput("");
    setError(undefined);
    setCopyState("idle");
  }

  async function copyOutput() {
    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <Card className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">输入文本</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            输入内容后运行工具，结果会显示在输出区域。
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="button" onClick={runTransform}>
            运行
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => setInput(exampleInput)}>
            试试示例
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={clearInput}>
            清空
          </Button>
        </div>
      </div>

      <Textarea
        aria-label="输入需要处理的文本"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            clearInput();
            return;
          }

          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            runTransform();
          }
        }}
        placeholder="在这里输入或粘贴文本"
      />

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">输出结果</h2>
          {output ? (
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={copyOutput}
            >
              复制结果
            </Button>
          ) : null}
        </div>
        {copyState === "copied" ? (
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            已复制到剪贴板。
          </p>
        ) : null}
        {copyState === "error" ? (
          <p className="mt-2 text-sm text-error" role="alert">
            复制失败，请手动复制。
          </p>
        ) : null}
        <pre
          aria-live="polite"
          className="mt-4 min-h-32 whitespace-pre-wrap break-words rounded-control bg-surface-muted p-4 font-mono text-sm"
        >
          {output || "—"}
        </pre>
      </div>
    </Card>
  );
}
