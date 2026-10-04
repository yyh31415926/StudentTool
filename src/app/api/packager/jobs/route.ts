import { randomUUID } from "node:crypto";
import { mkdir, writeFile, open, unlink } from "node:fs/promises";
import path from "node:path";
import { assertSiteRequest, boundedForm, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
import { requireNewTask } from "@/lib/packager/access";
import { PACKAGE_LIMITS, validatePackageOptions, validateProject } from "@/lib/packager/model";
import { dataRoot, jobDeadline, jobDirectory, listJobs, publicJob, removeJob, saveJob, taskToken } from "@/lib/packager/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let lock: Awaited<ReturnType<typeof open>> | undefined;
  let pendingId: string | undefined;
  try {
    assertSiteRequest(request, true);
    const grant = await requireNewTask(request);
    const recheck = async () => {
      const current = await requireNewTask(request);
      if (current.execution !== grant.execution || current.usageRevision !== grant.usageRevision || !current.profileIds.includes(options.pythonId)) throw new PackageHttpError("服务模式或使用资格已变更，请重新验证并提交。", 403);
    };
    const form = await boundedForm(request);
    const blobs = form.getAll("files");
    const paths: unknown = JSON.parse(String(form.get("paths") || "null"));
    if (!Array.isArray(paths) || paths.length !== blobs.length || !paths.every(item => typeof item === "string") || !blobs.every(item => item instanceof File)) throw new PackageHttpError("项目文件清单无效。");
    const files = blobs as File[];
    const metadata = validateProject(files.map((file, index) => ({ path: paths[index], size: file.size })));
    const options = validatePackageOptions(JSON.parse(String(form.get("options") || "null")), metadata);
    if (!grant.profileIds.includes(options.pythonId)) throw new PackageHttpError("Python 环境不可用，请重新选择。");
    await mkdir(dataRoot(), { recursive: true });
    try { lock = await open(path.join(dataRoot(), "submit.lock"), "wx"); } catch { throw new PackageHttpError("另一个项目正在上传，请稍后重试。", 429); }
    await recheck();
    const jobs = await listJobs();
    if (jobs.filter(job => !["succeeded", "failed", "cancelled"].includes(job.status)).length >= PACKAGE_LIMITS.queue || jobs.length >= 30) throw new PackageHttpError("任务队列或保留任务数量已满，请完成或删除任务后重试。", 429);
    const id = randomUUID(); const credentials = taskToken(); const directory = jobDirectory(id);
    pendingId = id;
    for (let index = 0; index < files.length; index++) {
      const target = path.join(directory, "project", metadata[index].path);
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, new Uint8Array(await files[index].arrayBuffer()), { flag: "wx" });
    }
    await recheck();
    const job = { id, tokenHash: credentials.tokenHash, options, execution: grant.execution, usageRevision: grant.usageRevision, status: "queued" as const, createdAt: Date.now(), updatedAt: Date.now(), expiresAt: jobDeadline(), message: grant.execution === "private" ? "已加入私人构建队列；仅处理可信项目。" : "已加入隔离任务队列。" };
    await saveJob(job);
    pendingId = undefined;
    return jsonResult({ job: await publicJob(job), token: credentials.token }, 201);
  } catch (error) { if (pendingId) await removeJob(pendingId).catch(() => {}); return failure(error); }
  finally { if (lock) { await lock.close(); await unlink(path.join(dataRoot(), "submit.lock")).catch(() => {}); } }
}
