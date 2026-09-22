import { getAllTools } from "../tools/registry";
import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
} from "./keys";
import {
  parseFavorites,
  serializeFavorites,
  sanitizeFavoriteIds,
} from "./schema";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getValidToolIds() {
  return new Set(getAllTools().map((tool) => tool.id));
}

export function readFavorites(
  storage: StorageLike | null = getBrowserStorage(),
): string[] {
  if (!storage) {
    return [];
  }

  try {
    return parseFavorites(storage.getItem(FAVORITES_STORAGE_KEY), getValidToolIds());
  } catch {
    return [];
  }
}

export function writeFavorites(
  ids: readonly string[],
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) {
    throw new Error("当前环境无法保存收藏。");
  }

  const validToolIds = getValidToolIds();
  storage.setItem(
    FAVORITES_STORAGE_KEY,
    serializeFavorites(ids, validToolIds),
  );

  if (typeof window !== "undefined") {
    try {
      if (storage === window.localStorage) {
        window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
      }
    } catch {
      // The write already succeeded; event dispatch is only for same-tab refresh.
    }
  }
}

export function addFavorite(
  ids: readonly string[],
  toolId: string,
): string[] {
  return sanitizeFavoriteIds([...ids, toolId], getValidToolIds());
}

export function removeFavorite(
  ids: readonly string[],
  toolId: string,
): string[] {
  return ids.filter((id) => id !== toolId);
}

export function isFavorite(ids: readonly string[], toolId: string): boolean {
  return ids.includes(toolId);
}
