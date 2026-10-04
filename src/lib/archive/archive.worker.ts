import type { SevenZipModule, SevenZipModuleOptions } from "7z-wasm";
import { ARCHIVE_FORMATS, ARCHIVE_LIMITS, archiveOutputName, parseArchiveListing, safeArchivePath, validateArchivePlan, type ArchiveOutput, type ArchiveRequest, type ArchiveResponse } from "../tools/archive";

// This TypeScript source is bundled into a classic Worker by archive:assets.
// The engine only sees an in-memory filesystem, never the host filesystem.
type WorkerScope = {
  importScripts: (...urls: string[]) => void;
  SevenZip: (options: Partial<SevenZipModuleOptions> & { noInitialRun: boolean }) => Promise<SevenZipModule>;
  postMessage: (message: ArchiveResponse, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<ArchiveRequest>) => void) | null;
};
const scope = typeof self === "undefined" ? null : self as unknown as WorkerScope;

function errorMessage(log: string): string {
  if (/password|encrypted/i.test(log)) return "压缩包需要密码或密码不正确，请填写解压密码后重试。";
  if (/unsupported method/i.test(log)) return "该压缩包使用了暂不支持的算法，请换一种格式或使用桌面解压软件。";
  return "无法读取压缩包，文件可能损坏、不完整或格式不受支持；加密压缩包请检查解压密码。";
}

export async function processArchive(request: ArchiveRequest, factory: WorkerScope["SevenZip"], status: (message: string) => void = () => {}): Promise<ArchiveOutput[]> {
  validateArchivePlan({ ...request, files: request.files.map(({ name, file, directory }) => ({ name, size: file.size, directory })) }, request.repack ? ARCHIVE_LIMITS.outputBytes : ARCHIVE_LIMITS.inputBytes);
  status("正在加载本地压缩引擎…");
  let lines: string[] = [];
  let logSize = 0;
  let limitError = "";
  function capture(line: string) {
    logSize += line.length;
    if (logSize > 2 * 1024 * 1024) { limitError = "压缩包目录过大，请使用桌面解压软件处理。"; throw new Error(limitError); }
    lines.push(line);
  }
  const engine = await factory({ noInitialRun: true, stdin: () => -1, print: capture, printErr: capture, locateFile: () => "/archive/7zz.wasm" });
  const fs = engine.FS;
  for (const directory of ["/input", "/output", "/intermediate"]) fs.mkdir(directory);
  // Bound writes even if a malicious archive lies about its uncompressed size.
  const originalWrite = fs.write.bind(fs);
  const grownBytes = new Map<string, number>();
  fs.write = (stream, buffer, offset, length, position, canOwn) => {
    // Upstream types leave FSStream empty; these fields belong to Emscripten's runtime stream.
    const runtimeStream = stream as typeof stream & { path: string; position: number };
    const root = runtimeStream.path.startsWith("/output/") ? "output" : runtimeStream.path.startsWith("/intermediate/") ? "intermediate" : null;
    if (root) {
      const currentSize = fs.stat(runtimeStream.path).size;
      const growth = Math.max(0, (position ?? runtimeStream.position) + length - currentSize);
      const used = grownBytes.get(root) ?? 0;
      if (used + growth > ARCHIVE_LIMITS.outputBytes) { limitError = "处理结果超过 100 MB 限制。"; throw new Error(limitError); }
      grownBytes.set(root, used + growth);
    }
    return originalWrite(stream, buffer, offset, length, position, canOwn);
  };
  function command(args: string[]) {
    lines = [];
    logSize = 0;
    limitError = "";
    let exitCode: number;
    try { exitCode = engine.callMain(args) as unknown as number; }
    catch { throw new Error(limitError || errorMessage(lines.join("\n"))); }
    if (exitCode !== 0) throw new Error(limitError || errorMessage(lines.join("\n")));
    return lines.join("\n");
  }
  for (const { name, file, directory } of request.files) {
    const path = safeArchivePath(name);
    const parts = path.split("/");
    let parent = "/input";
    for (const part of directory ? parts : parts.slice(0, -1)) {
      parent += `/${part}`;
      try { fs.mkdir(parent); } catch { /* Shared parent already exists. */ }
    }
    if (!directory) fs.writeFile(`/input/${path}`, new Uint8Array(await file.arrayBuffer()));
  }
  if (request.mode === "compress") {
    status("正在压缩…");
    fs.chdir("/input");
    const option = ARCHIVE_FORMATS.find(({ id }) => id === request.format)!;
    const outputName = archiveOutputName(request.format, request.files[0].name);
    let inputs = request.files.map(({ name }) => safeArchivePath(name));
    if (request.format.startsWith("tar.")) {
      command(["a", "-ttar", "-bd", "/intermediate/archive.tar", "--", ...inputs]);
      inputs = ["/intermediate/archive.tar"];
    }
    command(["a", `-t${option.engine}`, "-bd", "-y", `/output/${outputName}`, "--", ...inputs]);
    return [{ name: outputName, data: fs.readFile(`/output/${outputName}`) as Uint8Array }];
  }
  status("正在检查压缩包目录…");
  const password = request.password ? `-p${request.password}` : "-p";
  function extract(path: string, target: string) {
    const listing = command(["l", "-slt", "-ba", "-bd", password, "--", path]);
    const entries = parseArchiveListing(listing);
    status("正在解压…");
    command(["x", "-bd", "-y", password, `-o${target}`, "--", path]);
    return entries;
  }
  const source = `/input/${safeArchivePath(request.files[0].name)}`;
  // TAR compression wrappers are unpacked exactly once more, not recursively.
  const wrappedTar = /\.(tar\.(gz|bz2|xz)|tgz|tbz2?|txz)$/i.test(source);
  if (wrappedTar) {
    extract(source, "/intermediate");
    const files = fs.readdir("/intermediate").filter((name) => name !== "." && name !== "..");
    if (files.length !== 1 || !fs.isFile(fs.lstat(`/intermediate/${files[0]}`).mode)) throw new Error("TAR 组合压缩包内容异常。");
    extract(`/intermediate/${files[0]}`, "/output");
  } else {
    extract(source, "/output");
  }
  const results: ArchiveOutput[] = [];
  let totalBytes = 0;
  function collect(directory: string, prefix: string) {
    for (const name of fs.readdir(directory)) {
      if (name === "." || name === "..") continue;
      const path = `${directory}/${name}`;
      const relative = safeArchivePath(`${prefix}${name}`);
      const info = fs.lstat(path);
      if (fs.isDir(info.mode)) {
        if (fs.readdir(path).filter((name) => name !== "." && name !== "..").length === 0) {
          results.push({ name: `${relative}/`, data: new Uint8Array(), directory: true });
        } else collect(path, `${relative}/`);
      }
      else if (fs.isFile(info.mode)) {
        totalBytes += info.size;
        if (totalBytes > ARCHIVE_LIMITS.outputBytes || results.length >= ARCHIVE_LIMITS.entries) throw new Error("解压结果超过限制（100 MB 或 1000 个文件）。");
        results.push({ name: relative, data: fs.readFile(path) as Uint8Array });
      } else throw new Error("不支持包含链接或特殊文件的压缩包。");
    }
  }
  collect("/output", "");
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

if (scope) scope.onmessage = async ({ data }) => {
  try {
    scope.importScripts("/archive/7zz.js");
    const files = await processArchive(data, scope.SevenZip, (message) => scope.postMessage({ type: "status", message }));
    scope.postMessage({ type: "result", files }, files.map(({ data }) => data.buffer as ArrayBuffer));
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : "本地处理失败，请换一个文件重试。" });
  }
};
