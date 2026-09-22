"use client";

import { useCallback, useEffect, useState } from "react";
import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY } from "@/lib/favorites/keys";
import {
  addFavorite,
  isFavorite,
  readFavorites,
  removeFavorite,
  writeFavorites,
} from "@/lib/favorites/service";

const STORAGE_ERROR_MESSAGE = "无法保存收藏，请检查浏览器存储设置。";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setFavoriteIds(readFavorites());
  }, []);

  useEffect(() => {
    const initialRead = window.setTimeout(refresh, 0);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY) {
        refresh();
      }
    };
    const handleFavoritesChange = () => refresh();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChange);

    return () => {
      window.clearTimeout(initialRead);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChange);
    };
  }, [refresh]);

  const toggleFavorite = useCallback(
    (toolId: string) => {
      if (favoriteIds === null) {
        return;
      }

      const previousIds = favoriteIds;
      const nextIds = isFavorite(previousIds, toolId)
        ? removeFavorite(previousIds, toolId)
        : addFavorite(previousIds, toolId);

      setFavoriteIds(nextIds);

      try {
        writeFavorites(nextIds);
        setError(null);
      } catch {
        setFavoriteIds(previousIds);
        setError(STORAGE_ERROR_MESSAGE);
      }
    },
    [favoriteIds],
  );

  return {
    favoriteIds: favoriteIds ?? [],
    isLoaded: favoriteIds !== null,
    isFavorite: (toolId: string) =>
      favoriteIds !== null && isFavorite(favoriteIds, toolId),
    toggleFavorite,
    error,
  };
}
