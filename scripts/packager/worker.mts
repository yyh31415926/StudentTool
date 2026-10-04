import { open, unlink, access, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { PACKAGE_LIMITS } from "../../src/lib/packager/model";
import { atomicJson, cleanupExpired, dataRoot, getConfig, jobDirectory, listJobs, saveJob } from "../../src/lib/packager/store";
import { buildJob } from "../../src/lib/packager/builder";

// Bundled by esbuild so .ts imports in source do not constrain the server runtime.
if (process.platform !== "win32") throw new Error("此阶段只支持 Windows 构建机器。");
const config = await getConfig();
if (!config.profiles.length) throw new Error("请先执行 npm run packager:prepare -- --python Python路径。");
const lockPath = path.join(dataRoot(), "worker.lock");
let lock;
try { lock = await open(lockPath, "wx"); } catch { throw new Error("已有 Worker 或残留 worker.lock。请按文档核对进程后处理，不能同时启动两份服务。"); }
await lock.writeFile(String(process.pid));
let stopping = false; let controller: AbortController | undefined;
const stop = () => { stopping = true; controller?.abort("打包服务已停止，当前任务已取消。"); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
process.on("message", message => { if (message && typeof message === "object" && "type" in message && message.type === "stop") stop(); });
let heartbeatWrite = Promise.resolve();
const heartbeat = setInterval(() => { heartbeatWrite = heartbeatWrite.then(() => atomicJson(path.join(dataRoot(), "heartbeat.json"), { at: Date.now(), pid: process.pid })).catch(() => { console.error("无法写入服务状态，正在停止 Worker。"); stop(); }); }, 3000);
try {
  await atomicJson(path.join(dataRoot(), "heartbeat.json"), { at: Date.now(), pid: process.pid });
  for (const job of await listJobs()) if (["preparing", "installing", "building"].includes(job.status)) { job.status = "failed"; job.message = "上次服务中断，请重新提交项目。"; job.updatedAt = Date.now(); await saveJob(job); }
  // Log cleanup is driven by this same single worker, not by public requests.
  console.log("本机 Python 打包服务已启动；第一阶段仅接受本机网站任务。Ctrl+C 停止。");
  let cleanupAt = 0;
  while (!stopping) {
    if (Date.now() > cleanupAt) { await cleanupExpired(); cleanupAt = Date.now() + 60_000; }
    const job = (await listJobs()).find(item => item.status === "queued");
    if (!job) { await new Promise(resolve => setTimeout(resolve, 1000)); continue; }
    if (job.expiresAt <= Date.now()) { job.status = "cancelled"; job.message = "任务已过期，不再构建。"; job.updatedAt = Date.now(); await saveJob(job); await cleanupExpired(); continue; }
    const cancelFile = path.join(jobDirectory(job.id), "cancel");
    try { await access(cancelFile); job.status = "cancelled"; job.message = "已取消排队任务。"; job.updatedAt = Date.now(); await saveJob(job); continue; } catch { /* Not cancelled. */ }
    const profile = config.profiles.find(item => item.id === job.options.pythonId);
    if (!profile) { job.status = "failed"; job.message = "配置的 Python 已不可用。"; await saveJob(job); continue; }
    controller = new AbortController(); const taskController = controller;
    const timeout = setTimeout(() => taskController.abort("任务超过 20 分钟限制，已终止。"), PACKAGE_LIMITS.timeoutMs);
    const monitor = setInterval(() => { void (async () => {
      try { await access(cancelFile); taskController.abort("任务已取消。"); } catch { /* No cancellation. */ }
      // Bound overall task disk use during dependency installs and builds as well.
      async function size(directory: string): Promise<number> { let total = 0; for (const entry of await readdir(directory, { withFileTypes: true })) { const location = path.join(directory, entry.name); const info = await lstat(location); if (info.isSymbolicLink()) continue; total += info.isDirectory() ? await size(location) : info.size; if (total > 2 * 1024 ** 3) break; } return total; }
      try { if (await size(jobDirectory(job.id)) > 2 * 1024 ** 3) taskController.abort("任务临时文件超过 2 GiB 限制，已终止。"); } catch { /* Files may change while building. */ }
    })(); }, 2000);
    try { await buildJob(job, profile, taskController.signal); } finally { clearTimeout(timeout); clearInterval(monitor); controller = undefined; }
  }
} finally {
  clearInterval(heartbeat); await heartbeatWrite; await lock.close(); await unlink(lockPath); await unlink(path.join(dataRoot(), "heartbeat.json")).catch(() => {});
  if (process.connected) process.disconnect();
}
