"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { QRCodeDecodePanel } from "./QRCodeDecodePanel";
import { QRCodeEncodePanel } from "./QRCodeEncodePanel";

type QRCodeMode = "encode" | "decode";

type QRCodeToolProps = {
  toolId: string;
  exampleInput: string;
  emptyHint?: string;
  errorHint?: string;
};

const MODES: readonly { id: QRCodeMode; label: string }[] = [
  { id: "encode", label: "内容转二维码" },
  { id: "decode", label: "二维码转内容" },
];

/**
 * 二维码工具顶层：负责两个功能的切换。
 *
 * 两个面板同时挂载、用 CSS 隐藏未选中者，从而在切换时保留各自的输入内容，
 * 且不刷新页面、不重新加载。当前选中模式用实心底强调。
 */
export function QRCodeTool({ exampleInput, emptyHint }: QRCodeToolProps) {
  const [mode, setMode] = useState<QRCodeMode>("encode");

  return (
    <Card className="space-y-6">
      <div
        role="tablist"
        aria-label="选择二维码功能"
        className="flex rounded-control border border-border bg-surface-muted p-1"
      >
        {MODES.map((item) => {
          const isActive = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(item.id)}
              className={`min-h-touch flex-1 rounded-control px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={mode === "encode" ? undefined : "hidden"}>
        <QRCodeEncodePanel exampleInput={exampleInput} emptyHint={emptyHint} />
      </div>

      <div className={mode === "decode" ? undefined : "hidden"}>
        <QRCodeDecodePanel />
      </div>
    </Card>
  );
}
