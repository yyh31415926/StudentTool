import { describe, expect, it } from "vitest";
import { parseRecent, readRecent, recordToolUse, RECENT_KEY } from "../src/lib/recent/service";

function memory(initial: string | null = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
}
describe("recent tool metadata", () => {
  it("starts empty without storage", () => expect(readRecent(null)).toEqual([]));
  it.each([null, "broken", "[]", '{"schemaVersion":1}', '{"schemaVersion":0,"recent":[]}'])("tolerates invalid documents: %s", (raw) => expect(parseRecent(raw)).toEqual([]));
  it("records only ids, timestamps, and counts", () => {
    const storage = memory();
    expect(recordToolUse("char-count", storage, 100)).toBe(true);
    expect(JSON.parse(storage.getItem()!)).toEqual({ schemaVersion: 1, recent: [{ id: "char-count", usedAt: 100, count: 1 }] });
  });
  it("increments use count and moves the last used tool first", () => {
    const storage = memory();
    recordToolUse("char-count", storage, 100);
    recordToolUse("unit-convert", storage, 200);
    recordToolUse("char-count", storage, 300);
    expect(readRecent(storage)).toEqual([{ id: "char-count", usedAt: 300, count: 2 }, { id: "unit-convert", usedAt: 200, count: 1 }]);
  });
  it("rejects unknown tools", () => expect(recordToolUse("gone", memory())).toBe(false));
  it("cleans corrupt entries, duplicate ids, and extra fields", () => {
    const recent = [{ id: "gone", usedAt: 1, count: 1 }, { id: "unit-convert", usedAt: 2, count: -1 }, { id: "base64", usedAt: "3", count: 1 }, { id: "char-count", usedAt: 4, count: 1, input: "private" }, { id: "char-count", usedAt: 5, count: 1 }];
    expect(parseRecent(JSON.stringify({ schemaVersion: 1, recent }))).toEqual([{ id: "char-count", usedAt: 4, count: 1 }]);
  });
  it("reads future versions without overwriting them", () => {
    const raw = JSON.stringify({ schemaVersion: 2, recent: [{ id: "base64", usedAt: 1, count: 1 }], future: true });
    const storage = memory(raw);
    expect(readRecent(storage)).toHaveLength(1);
    expect(recordToolUse("char-count", storage)).toBe(false);
    expect(storage.getItem()).toBe(raw);
  });
  it("reports blocked writes and preserves the previous data", () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(recordToolUse("char-count", storage)).toBe(false);
    expect(readRecent({ ...storage, getItem: () => { throw new Error("blocked"); } })).toEqual([]);
    expect(RECENT_KEY).toBe("studenttool:recent");
  });
});
