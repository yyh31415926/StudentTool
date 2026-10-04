/** Pure archive configuration and validation. File IO and WASM live in the Worker. */
export const ARCHIVE_FORMATS = [
  { id: "zip", label: "ZIP", engine: "zip", single: false },
  { id: "7z", label: "7z", engine: "7z", single: false },
  { id: "tar", label: "TAR（仅打包）", engine: "tar", single: false },
  { id: "tar.gz", label: "TAR.GZ", engine: "gzip", single: false },
  { id: "tar.bz2", label: "TAR.BZ2", engine: "bzip2", single: false },
  { id: "tar.xz", label: "TAR.XZ", engine: "xz", single: false },
  { id: "gz", label: "GZ（单文件）", engine: "gzip", single: true },
  { id: "bz2", label: "BZ2（单文件）", engine: "bzip2", single: true },
  { id: "xz", label: "XZ（单文件）", engine: "xz", single: true },
] as const;
export type ArchiveFormat = (typeof ARCHIVE_FORMATS)[number]["id"];
export type ArchiveMode = "compress" | "extract";
export const ARCHIVE_LIMITS = { inputBytes: 50 * 1024 * 1024, outputBytes: 100 * 1024 * 1024, entries: 1000, timeoutMs: 120_000 } as const;
export type ArchiveFileMeta = { name: string; size: number; directory?: boolean };
export type ArchivePlan = { mode: ArchiveMode; format: ArchiveFormat; files: readonly ArchiveFileMeta[] };
export type ArchiveInput = { name: string; file: Blob; directory?: boolean };
export type ArchiveOutput = { name: string; data: Uint8Array; directory?: boolean };
export type ArchiveRequest = { mode: ArchiveMode; format: ArchiveFormat; files: ArchiveInput[]; password?: string; repack?: boolean };
export type ArchiveResponse =
  | { type: "status"; message: string }
  | { type: "result"; files: ArchiveOutput[] }
  | { type: "error"; message: string };

export function safeArchivePath(name: string): string {
  const path = name.replace(/\\/g, "/");
  if (!path || path.startsWith("/") || /^[a-z]:/i.test(path) || /[\x00-\x1f\x7f]/.test(path)) {
    throw new Error("文件名包含不安全的路径或控制字符，请重命名后重试。");
  }
  const parts = path.replace(/\/$/, "").split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes(":")) || path.length > 1024) {
    throw new Error("文件路径无效，不支持路径回退或绝对路径。");
  }
  return parts.join("/");
}

export function isSupportedArchive(name: string): boolean {
  return /\.(zip|7z|rar|tar|gz|gzip|tgz|bz2|tbz2?|xz|txz)$/i.test(name);
}

export function validateArchivePlan(input: unknown, maxInputBytes: number = ARCHIVE_LIMITS.inputBytes): ArchivePlan {
  if (!input || typeof input !== "object") throw new Error("请先添加文件或输入文字。");
  const plan = input as Partial<ArchivePlan>;
  if (plan.mode !== "compress" && plan.mode !== "extract") throw new Error("请选择压缩或解压。");
  const format = ARCHIVE_FORMATS.find((item) => item.id === plan.format);
  if (!format) throw new Error("不支持该压缩格式。");
  if (!Array.isArray(plan.files) || !plan.files.length) throw new Error("请先添加文件或输入文字。");
  if (plan.files.length > ARCHIVE_LIMITS.entries) throw new Error("最多添加 1000 个文件。");
  let total = 0;
  const paths = new Set<string>();
  const regularFiles = new Set<string>();
  for (const file of plan.files) {
    if (!file || typeof file.name !== "string" || !Number.isSafeInteger(file.size) || file.size < 0) throw new Error("文件信息无效，请重新选择文件。");
    const path = safeArchivePath(file.name);
    if (paths.has(path)) throw new Error(`文件名重复：${path}。请移除或重命名重复文件。`);
    paths.add(path);
    if (!file.directory) regularFiles.add(path);
    total += file.size;
  }
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      if (regularFiles.has(parts.slice(0, i).join("/"))) throw new Error("文件与文件夹路径冲突，请重命名后重试。");
    }
  }
  if (total > maxInputBytes) throw new Error(`输入文件总大小不能超过 ${Math.floor(maxInputBytes / 1024 / 1024)} MB。`);
  if (plan.mode === "extract") {
    if (plan.files.length !== 1) throw new Error("解压时请只选择一个压缩包。");
    if (!isSupportedArchive(plan.files[0].name)) throw new Error("请选择 ZIP、7z、RAR、TAR、GZ、BZ2、XZ 或 TAR 组合格式的压缩包。");
    if (!total) throw new Error("压缩包为空，请选择有效的压缩包。");
  } else if (format.single && plan.files.length !== 1) {
    throw new Error("GZ、BZ2、XZ 只能压缩一个文件；多个文件请选择 ZIP、7z 或 TAR 组合格式。");
  }
  return { mode: plan.mode, format: format.id, files: plan.files };
}

export type ListedEntry = { name: string; size: number; directory: boolean };
/** Parse 7-Zip's technical listing before any extraction takes place. */
export function parseArchiveListing(text: string): ListedEntry[] {
  const entries: ListedEntry[] = [];
  let total = 0;
  const names = new Set<string>();
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const values = new Map<string, string>();
    for (const line of block.split("\n")) {
      const match = /^([^=]+?) = (.*)$/.exec(line);
      if (!match) continue;
      if (values.has(match[1])) throw new Error("压缩包目录信息异常，请使用桌面解压软件检查。");
      values.set(match[1], match[2]);
    }
    const rawName = values.get("Path");
    if (!rawName) continue;
    if (values.get("Symbolic Link") || values.get("Hard Link") || /(^|\s)l[rw-]/.test(values.get("Attributes") ?? "")) {
      throw new Error("不支持包含符号链接或硬链接的压缩包。");
    }
    const name = safeArchivePath(rawName);
    const size = Number(values.get("Size"));
    const directory = values.get("Folder") === "+" || /^D/.test(values.get("Attributes") ?? "");
    if (!values.has("Size") || !Number.isSafeInteger(size) || size < 0) throw new Error("无法确定解压大小，请使用桌面解压软件处理。");
    if (names.has(name)) throw new Error("压缩包中有重复路径，请使用桌面解压软件检查。");
    names.add(name);
    total += size;
    entries.push({ name, size, directory });
    if (entries.length > ARCHIVE_LIMITS.entries || total > ARCHIVE_LIMITS.outputBytes) throw new Error("解压结果超过限制（100 MB 或 1000 项）。请使用桌面解压软件处理。");
  }
  return entries;
}

export function formatArchiveSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function archiveOutputName(format: ArchiveFormat, inputName: string): string {
  const option = ARCHIVE_FORMATS.find((item) => item.id === format)!;
  return option.single ? `${inputName.split("/").pop()}.${format}` : `archive.${format}`;
}
