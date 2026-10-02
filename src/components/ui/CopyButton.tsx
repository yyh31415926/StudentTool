"use client";
import { useEffect, useState } from "react";
import { Button } from "./Button";
export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  return <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="secondary" type="button" disabled={!text} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setState("copied"); } catch { setState("failed"); }
  }}>复制结果</Button><span role="status" className={`text-sm ${state === "failed" ? "text-error" : "text-success"}`}>{state === "copied" ? "已复制" : state === "failed" ? "复制失败，请手动复制。" : ""}</span></div>;
}
