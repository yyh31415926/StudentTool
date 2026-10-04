import { readFileSync } from "node:fs";
import path from "node:path";
import SevenZip from "7z-wasm";
import { describe, expect, it } from "vitest";
import { processArchive } from "../src/lib/archive/archive.worker";
import { ARCHIVE_FORMATS, type ArchiveFormat, type ArchiveInput } from "../src/lib/tools/archive";

const factory: Parameters<typeof processArchive>[1] = (options) => SevenZip({ ...options, locateFile: () => path.join(process.cwd(), "node_modules/7z-wasm/7zz.wasm") });
const content = "你好😀\n学习笔记\nquote,comma,\"中文\"";
const inputs: ArchiveInput[] = [{ name: "学习/笔记😀.txt", file: new Blob([content]) }];

describe("real archive engine", () => {
  it.each(ARCHIVE_FORMATS)("round-trips $id with actual WASM compression and extraction", async ({ id }) => {
    const packed = await processArchive({ mode: "compress", format: id, files: inputs }, factory);
    const extracted = await processArchive({ mode: "extract", format: "zip", files: [{ name: packed[0].name, file: new Blob([packed[0].data.slice().buffer as ArrayBuffer]) }] }, factory);
    expect(extracted).toHaveLength(1);
    expect(new TextDecoder().decode(extracted[0].data)).toBe(content);
    expect(extracted[0].name).toBe(id === "gz" || id === "bz2" || id === "xz" ? "笔记😀.txt" : "学习/笔记😀.txt");
  }, 20_000);
  it.each(["zip", "7z", "tar", "tar.gz", "tar.bz2", "tar.xz"] as ArchiveFormat[])("preserves multiple files and empty files in %s", async (format) => {
    const files = [...inputs, { name: "空.txt", file: new Blob([]) }];
    const packed = await processArchive({ mode: "compress", format, files }, factory);
    const extracted = await processArchive({ mode: "extract", format: "zip", files: [{ name: packed[0].name, file: new Blob([packed[0].data.slice().buffer as ArrayBuffer]) }] }, factory);
    expect(extracted.map(({ name }) => name)).toEqual(expect.arrayContaining(["学习/笔记😀.txt", "空.txt"]));
    expect(extracted.find(({ name }) => name === "空.txt")?.data.length).toBe(0);
  }, 20_000);
  it.each(["v4", "v5"])("extracts an external RAR %s fixture", async (version) => {
    const bytes = readFileSync(path.join(process.cwd(), `tests/fixtures/archives/test-${version}.rar`));
    const extracted = await processArchive({ mode: "extract", format: "zip", files: [{ name: "test.rar", file: new Blob([bytes]) }] }, factory);
    expect(extracted.length).toBeGreaterThan(0);
    expect(extracted.some(({ data }) => data.length > 0)).toBe(true);
  }, 20_000);
  it("rejects a corrupt ZIP without returning files", async () => {
    await expect(processArchive({ mode: "extract", format: "zip", files: [{ name: "broken.zip", file: new Blob(["not a zip"]) }] }, factory)).rejects.toThrow("损坏");
  });
  it("preserves empty directories when extracting and repacking ZIP", async () => {
    const packed = await processArchive({ mode: "compress", format: "zip", files: [{ name: "空目录/", file: new Blob([]), directory: true }] }, factory);
    const unpack = (data: Uint8Array) => processArchive({ mode: "extract", format: "zip", files: [{ name: "empty.zip", file: new Blob([data.slice().buffer as ArrayBuffer]) }] }, factory);
    const extracted = await unpack(packed[0].data);
    expect(extracted).toMatchObject([{ name: "空目录/", directory: true }]);
    const repacked = await processArchive({ mode: "compress", format: "zip", repack: true, files: extracted.map(({ name, data, directory }) => ({ name, directory, file: new Blob([data.slice().buffer as ArrayBuffer]) })) }, factory);
    expect(await unpack(repacked[0].data)).toMatchObject([{ name: "空目录/", directory: true }]);
  });
  it.each(["zip", "7z"])("handles correct and wrong passwords for encrypted %s", async (format) => {
    const z = await factory({ noInitialRun: true, print: () => {}, printErr: () => {}, stdin: () => -1 });
    z.FS.writeFile("/secret.txt", new TextEncoder().encode(content));
    z.callMain(["a", `-t${format}`, "-ptest-password", ...(format === "7z" ? ["-mhe=on"] : []), `/secret.${format}`, "/secret.txt"]);
    const data = z.FS.readFile(`/secret.${format}`) as Uint8Array;
    const files = [{ name: `secret.${format}`, file: new Blob([data.slice().buffer as ArrayBuffer]) }];
    await expect(processArchive({ mode: "extract", format: "zip", files, password: "wrong" }, factory)).rejects.toThrow("密码");
    const result = await processArchive({ mode: "extract", format: "zip", files, password: "test-password" }, factory);
    expect(new TextDecoder().decode(result[0].data)).toBe(content);
  }, 20_000);
});
