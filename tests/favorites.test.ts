import { describe, expect, it } from "vitest";
import {
  addFavorite,
  isFavorite,
  readFavorites,
  removeFavorite,
  writeFavorites,
  type StorageLike,
} from "../src/lib/favorites/service";
import { FAVORITES_STORAGE_KEY } from "../src/lib/favorites/keys";
import { parseFavorites } from "../src/lib/favorites/schema";

function createStorage(initialValue: string | null = null): StorageLike & {
  value: string | null;
} {
  return {
    value: initialValue,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

describe("favorites service", () => {
  it("reads an empty favorite list when storage is empty", () => {
    expect(readFavorites(createStorage())).toEqual([]);
  });

  it("adds and removes favorite ids", () => {
    const initial = ["char-count"];
    const added = addFavorite(initial, "unit-convert");

    expect(added).toEqual(["char-count", "unit-convert"]);
    expect(removeFavorite(added, "char-count")).toEqual(["unit-convert"]);
  });

  it("checks whether an id is favorited", () => {
    expect(isFavorite(["char-count"], "char-count")).toBe(true);
    expect(isFavorite(["char-count"], "base-convert")).toBe(false);
  });

  it("deduplicates and persists only registered ids", () => {
    const storage = createStorage();

    writeFavorites(
      ["char-count", "char-count", "missing-tool"],
      storage,
    );

    expect(JSON.parse(storage.value ?? "{}")).toEqual({
      schemaVersion: 1,
      favorites: ["char-count"],
    });
    expect(readFavorites(storage)).toEqual(["char-count"]);
  });

  it("parses malformed or legacy data as a safe list", () => {
    const validIds = new Set(["char-count"]);

    expect(parseFavorites("not-json", validIds)).toEqual([]);
    expect(parseFavorites('["char-count", "missing-tool"]', validIds)).toEqual([
      "char-count",
    ]);
  });

  it("uses the centralized storage key", () => {
    const storage = createStorage();

    writeFavorites(["base-convert"], storage);

    expect(FAVORITES_STORAGE_KEY).toBe("studenttool:favorites");
    expect(storage.value).toContain('"favorites":["base-convert"]');
  });

  it("does not hide storage write failures", () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };

    expect(() => writeFavorites(["char-count"], storage)).toThrow(
      "quota exceeded",
    );
  });

  it("strictly validates schemaVersion on versioned data", () => {
    const validIds = new Set(["char-count"]);

    // 当前版本正常读取
    expect(
      parseFavorites('{"schemaVersion":1,"favorites":["char-count"]}', validIds),
    ).toEqual(["char-count"]);

    // 更新的版本：只读已知字段（向前兼容）
    expect(
      parseFavorites('{"schemaVersion":2,"favorites":["char-count"]}', validIds),
    ).toEqual(["char-count"]);

    // 缺少 schemaVersion / 类型不对 / 版本更旧：结构不可信，返回空列表
    expect(parseFavorites('{"favorites":["char-count"]}', validIds)).toEqual([]);
    expect(
      parseFavorites('{"schemaVersion":"1","favorites":["char-count"]}', validIds),
    ).toEqual([]);
    expect(
      parseFavorites('{"schemaVersion":0,"favorites":["char-count"]}', validIds),
    ).toEqual([]);
  });
});
