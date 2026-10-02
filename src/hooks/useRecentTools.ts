"use client";
import { useEffect, useState } from "react";
import { readRecent, RECENT_EVENT, RECENT_KEY, type RecentTool } from "@/lib/recent/service";
export function useRecentTools() {
  const [recent, setRecent] = useState<RecentTool[] | null>(null);
  useEffect(() => {
    const refresh = () => setRecent(readRecent());
    const timer = window.setTimeout(refresh, 0);
    const onStorage = (event: StorageEvent) => { if (event.key === RECENT_KEY || event.key === null) refresh(); };
    window.addEventListener(RECENT_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => { window.clearTimeout(timer); window.removeEventListener(RECENT_EVENT, refresh); window.removeEventListener("storage", onStorage); };
  }, []);
  return { recent: recent ?? [], isLoaded: recent !== null };
}
