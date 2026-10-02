"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { recordToolUse } from "@/lib/recent/service";

const UsageContext = createContext<(() => void) | null>(null);
export function ToolUsageBoundary({ toolId, children }: { toolId: string; children: ReactNode }) {
  const recorded = useRef(false);
  const [failed, setFailed] = useState(false);
  const record = useCallback(() => {
    if (recorded.current) return;
    recorded.current = true;
    setFailed(!recordToolUse(toolId));
  }, [toolId]);
  return <UsageContext.Provider value={record}>{children}{failed && <p role="status" className="mt-3 text-sm text-warning">无法保存最近使用记录，工具仍可正常使用。</p>}</UsageContext.Provider>;
}
/** Count at most once per visit after a successful result, never on page open. */
export function useToolUsage(hasResult: boolean) {
  const record = useContext(UsageContext);
  useEffect(() => {
    if (!hasResult || !record) return;
    const timer = window.setTimeout(record, 0);
    return () => window.clearTimeout(timer);
  }, [hasResult, record]);
}
