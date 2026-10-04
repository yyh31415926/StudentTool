import { runArchive } from "@/lib/archive/client";
import { validateProject, type ProjectFile } from "@/lib/packager/model";
export type UploadedFile = { path: string; file: File };
export async function unpackInputs(incoming: UploadedFile[]): Promise<UploadedFile[]> {
  const result: UploadedFile[] = [];
  for (const item of incoming) {
    if (/\.zip$/i.test(item.path)) {
      const contents = await runArchive({ mode: "extract", format: "zip", files: [{ name: item.file.name, file: item.file }] }, new AbortController().signal, () => {});
      for (const output of contents) if (!output.directory) result.push({ path: output.name, file: new File([output.data.slice().buffer as ArrayBuffer], output.name.split("/").pop()!, { type: "application/octet-stream" }) });
    } else result.push(item);
  }
  const top = result[0]?.path.split("/")[0];
  if (top && result.every(item => item.path.startsWith(`${top}/`))) result.forEach(item => { item.path = item.path.slice(top.length + 1); });
  validateProject(result.map(item => ({ path: item.path, size: item.file.size })));
  return result;
}
export async function droppedFiles(items: DataTransferItemList): Promise<UploadedFile[]> {
  const result: UploadedFile[] = [];
  async function walk(entry: FileSystemEntry, prefix: string) {
    if (result.length >= 1000) throw new Error("项目最多 1000 个文件。");
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      result.push({ path: prefix + file.name, file });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      while (true) {
        const children = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!children.length) break;
        for (const child of children) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  }
  // Capture entries before awaiting: the browser clears the drop data store afterwards.
  const entries = Array.from(items, item => ({ entry: item.webkitGetAsEntry?.(), file: item.getAsFile() }));
  for (const { entry, file } of entries) {
    if (entry) await walk(entry, "");
    else if (file) result.push({ path: file.name, file });
  }
  return result;
}
export const metadata = (files: UploadedFile[]): ProjectFile[] => files.map(({ path, file }) => ({ path, size: file.size }));
