import { describe, expect, it } from "vitest";
import { ARCHIVE_FORMATS, ARCHIVE_LIMITS, archiveOutputName, formatArchiveSize, isSupportedArchive, parseArchiveListing, safeArchivePath, validateArchivePlan } from "../../src/lib/tools/archive";
import { getToolById, getToolsByCategory } from "../../src/lib/tools/registry";

const plan = { mode: "compress", format: "zip", files: [{ name: "笔记😀.txt", size: 12 }] };

describe("archive validation", () => {
  it("accepts Unicode names, empty files and zero-byte inputs for compression", () => {
    expect(validateArchivePlan({ ...plan, files: [{ name: "学习/笔记😀.txt", size: 0 }] }).files).toHaveLength(1);
  });
  it.each([null, {}, { ...plan, files: [] }])("rejects missing inputs: %j", (value) => {
    expect(() => validateArchivePlan(value)).toThrow();
  });
  it("does not offer RAR creation", () => {
    expect(() => validateArchivePlan({ ...plan, format: "rar" })).toThrow("格式");
  });
  it.each(["/etc/file", "../a", "folder/../a", "C:\\a.txt", "a//b", "a\n.txt", "a\0b", "a:stream", ".", ""]) ("rejects unsafe paths: %j", (name) => {
    expect(() => safeArchivePath(name)).toThrow();
  });
  it("normalizes backslashes", () => expect(safeArchivePath("folder\\a.txt")).toBe("folder/a.txt"));
  it("rejects duplicate normalized names", () => {
    expect(() => validateArchivePlan({ ...plan, files: [{ name: "a\\b", size: 0 }, { name: "a/b", size: 0 }] })).toThrow("重复");
  });
  it.each([-1, NaN, 1.5])("rejects invalid sizes: %s", (size) => expect(() => validateArchivePlan({ ...plan, files: [{ name: "a", size }] })).toThrow());
  it("enforces the aggregate 50 MB input limit", () => {
    expect(() => validateArchivePlan({ ...plan, files: [{ name: "a", size: ARCHIVE_LIMITS.inputBytes }, { name: "b", size: 1 }] })).toThrow("50 MB");
  });
  it("enforces the file count limit", () => {
    expect(() => validateArchivePlan({ ...plan, files: Array.from({ length: 1001 }, (_, i) => ({ name: `${i}`, size: 0 })) })).toThrow("1000");
  });
  it.each(["gz", "bz2", "xz"])("requires one input for %s", (format) => {
    expect(() => validateArchivePlan({ ...plan, format, files: [...plan.files, { name: "other", size: 1 }] })).toThrow("只能压缩一个");
  });
  it("requires one non-empty archive when extracting", () => {
    expect(() => validateArchivePlan({ ...plan, mode: "extract" })).toThrow("请选择 ZIP");
    expect(() => validateArchivePlan({ ...plan, mode: "extract", files: [{ name: "a.zip", size: 0 }] })).toThrow("为空");
    expect(() => validateArchivePlan({ ...plan, mode: "extract", files: [{ name: "a.zip", size: 1 }, { name: "b.zip", size: 1 }] })).toThrow("一个");
  });
  it.each(["notes.ZIP", "data.7z", "data.rar", "a.tar.gz", "a.tgz", "a.tbz2", "a.txz"])("accepts supported archive names: %s", (name) => expect(isSupportedArchive(name)).toBe(true));
  it("names single stream outputs after their input", () => {
    expect(archiveOutputName("gz", "笔记.txt")).toBe("笔记.txt.gz");
    expect(archiveOutputName("tar.xz", "笔记.txt")).toBe("archive.tar.xz");
  });
  it("formats result sizes", () => {
    expect(formatArchiveSize(0)).toBe("0 B");
    expect(formatArchiveSize(1024)).toBe("1.0 KB");
  });
  it("registers the new tool through the existing discovery registry", () => {
    expect(getToolById("archive")).toMatchObject({ name: "压缩&解压", customUI: "archive" });
    expect(getToolsByCategory("convert").some(({ id }) => id === "archive")).toBe(true);
    expect(ARCHIVE_FORMATS).toHaveLength(9);
  });
});

describe("archive directory preflight", () => {
  it("parses Unicode files and directories", () => {
    expect(parseArchiveListing("Path = 学习\nFolder = +\nSize = 0\n\nPath = 学习/笔记.txt\nFolder = -\nSize = 12\n")).toEqual([{ name: "学习", size: 0, directory: true }, { name: "学习/笔记.txt", size: 12, directory: false }]);
  });
  it("rejects oversized declared output", () => expect(() => parseArchiveListing(`Path = file\nSize = ${ARCHIVE_LIMITS.outputBytes + 1}\n`)).toThrow("超过限制"));
  it("rejects traversal before extraction", () => expect(() => parseArchiveListing("Path = ../escape\nSize = 0\n")).toThrow("路径"));
  it("rejects symbolic links", () => expect(() => parseArchiveListing("Path = link\nSize = 0\nSymbolic Link = ../outside\n")).toThrow("链接"));
  it("accepts the empty link fields emitted by TAR and RAR5 for regular files", () => {
    expect(parseArchiveListing("Path = file\nSize = 3\nSymbolic Link = \nHard Link = \n")).toEqual([{ name: "file", size: 3, directory: false }]);
  });
  it("rejects missing sizes, duplicate paths and malformed technical records", () => {
    expect(() => parseArchiveListing("Path = file\nEncrypted = +\n")).toThrow("大小");
    expect(() => parseArchiveListing("Path = a\nSize = 0\n\nPath = a\nSize = 0\n")).toThrow("重复");
    expect(() => parseArchiveListing("Path = a\nSize = 0\nSize = 1\n")).toThrow("异常");
  });
});
