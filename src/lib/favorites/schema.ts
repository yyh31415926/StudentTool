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

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return sanitizeFavoriteIds(parsed, validToolIds);
    }

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "favorites" in parsed &&
      Array.isArray(parsed.favorites)
    ) {
      return sanitizeFavoriteIds(parsed.favorites, validToolIds);
    }
  } catch {
    return [];
  }

  return [];
}
