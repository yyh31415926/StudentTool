import { getToolById } from "@/lib/tools/registry";

export const RECENT_KEY = "studenttool:recent";
export const RECENT_EVENT = "studenttool:recent-changed";
export type RecentTool = { id: string; usedAt: number; count: number };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
function browserStorage(): StorageLike | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
export function parseRecent(raw: string | null): RecentTool[] {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object" || !("schemaVersion" in value) || typeof value.schemaVersion !== "number" || value.schemaVersion < 1 || !("recent" in value) || !Array.isArray(value.recent)) return [];
    const seen = new Set<string>();
    return value.recent.filter((entry): entry is RecentTool => {
      if (!entry || typeof entry !== "object") return false;
      const { id, usedAt, count } = entry;
      if (typeof id !== "string" || !getToolById(id) || !Number.isFinite(usedAt) || usedAt < 0 || !Number.isSafeInteger(count) || count < 1 || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).map(({ id, usedAt, count }) => ({ id, usedAt, count })).sort((a, b) => b.usedAt - a.usedAt).slice(0, 8);
  } catch { return []; }
}
export function readRecent(storage: StorageLike | null = browserStorage()): RecentTool[] {
  try { return parseRecent(storage?.getItem(RECENT_KEY) ?? null); } catch { return []; }
}
/** Persist metadata only. Never store user inputs, images, or output text. */
export function recordToolUse(id: string, storage: StorageLike | null = browserStorage(), now = Date.now()): boolean {
  if (!storage || !getToolById(id)) return false;
  try {
    const raw = storage.getItem(RECENT_KEY);
    let version = 1;
    try { version = JSON.parse(raw ?? "null")?.schemaVersion ?? 1; } catch { /* Replace corrupt metadata. */ }
    if (version > 1) return false;
    const previous = parseRecent(raw);
    const count = Math.min((previous.find((item) => item.id === id)?.count ?? 0) + 1, Number.MAX_SAFE_INTEGER);
    const recent = [{ id, usedAt: now, count }, ...previous.filter((item) => item.id !== id)].slice(0, 8);
    storage.setItem(RECENT_KEY, JSON.stringify({ schemaVersion: 1, recent }));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(RECENT_EVENT));
    return true;
  } catch { return false; }
}
