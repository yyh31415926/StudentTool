import { ARCHIVE_LIMITS, type ArchiveOutput, type ArchiveRequest, type ArchiveResponse } from "../tools/archive";

export function runArchive(request: ArchiveRequest, signal: AbortSignal, onStatus: (message: string) => void): Promise<ArchiveOutput[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("已取消", "AbortError")); return; }
    const worker = new Worker("/archive/archive.worker.js");
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      worker.terminate();
    }
    function abort() { finish(); reject(new DOMException("已取消", "AbortError")); }
    const timer = setTimeout(() => { finish(); reject(new Error("处理超过两分钟，已停止。请减小文件大小或使用桌面压缩软件。")); }, ARCHIVE_LIMITS.timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<ArchiveResponse>) => {
      if (data.type === "status") onStatus(data.message);
      else {
        finish();
        if (data.type === "error") reject(new Error(data.message));
        else resolve(data.files);
      }
    };
    worker.onerror = () => { finish(); reject(new Error("压缩引擎加载或运行失败，请刷新页面重试。")); };
    try { worker.postMessage(request); }
    catch { finish(); reject(new Error("无法把文件交给本地压缩引擎，请重新选择文件。")); }
  });
}
