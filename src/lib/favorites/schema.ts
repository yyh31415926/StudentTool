export const FAVORITES_SCHEMA_VERSION = 1;

export type FavoritesDocument = {
  schemaVersion: number;
  favorites: string[];
};

export function sanitizeFavoriteIds(
  ids: readonly unknown[],
  validToolIds: ReadonlySet<string>,
): string[] {
  return Array.from(
    new Set(
      ids.filter(
        (id): id is string => typeof id === "string" && validToolIds.has(id),
      ),
    ),
  );
}

export function serializeFavorites(
  ids: readonly string[],
  validToolIds: ReadonlySet<string>,
): string {
  const document: FavoritesDocument = {
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    favorites: sanitizeFavoriteIds(ids, validToolIds),
  };

  return JSON.stringify(document);
}

export function parseFavorites(
  raw: string | null,
  validToolIds: ReadonlySet<string>,
): string[] {
  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  // 旧格式（v0，无版本号的纯数组）：迁移到当前格式，直接清洗。
  if (Array.isArray(parsed)) {
    return sanitizeFavoriteIds(parsed, validToolIds);
  }

  if (typeof parsed === "object" && parsed !== null) {
    const record = parsed as Record<string, unknown>;

    // 当前版本：正常读取。
    if (record.schemaVersion === FAVORITES_SCHEMA_VERSION) {
      return Array.isArray(record.favorites)
        ? sanitizeFavoriteIds(record.favorites, validToolIds)
        : [];
    }

    // 比当前代码更新的版本：只读已知字段，绝不把数据覆盖回旧版本。
    if (
      typeof record.schemaVersion === "number" &&
      record.schemaVersion > FAVORITES_SCHEMA_VERSION
    ) {
      return Array.isArray(record.favorites)
        ? sanitizeFavoriteIds(record.favorites, validToolIds)
        : [];
    }

    // 缺少 schemaVersion、类型不对或版本号更旧：结构不可信，返回空列表。
    return [];
  }

  return [];
}
