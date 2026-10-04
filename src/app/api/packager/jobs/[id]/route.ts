import { writeFile } from "node:fs/promises";
import path from "node:path";
import { assertSiteRequest, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
import { authorizedJob, jobDirectory, publicJob, removeJob } from "@/lib/packager/store";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try { assertSiteRequest(request); const { id } = await context.params; const job = await authorizedJob(id, request.headers.get("x-task-token") || ""); return jsonResult(await publicJob(job)); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try { assertSiteRequest(request, true); const { id } = await context.params; const job = await authorizedJob(id, request.headers.get("x-task-token") || "");
    if (["succeeded", "failed", "cancelled"].includes(job.status)) throw new PackageHttpError("任务已结束。");
    await writeFile(path.join(jobDirectory(id), "cancel"), "cancel"); return jsonResult({ message: "已请求取消，服务会终止本任务的构建进程。" });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { assertSiteRequest(request, true); const { id } = await context.params; const job = await authorizedJob(id, request.headers.get("x-task-token") || "");
    if (!["succeeded", "failed", "cancelled"].includes(job.status)) throw new PackageHttpError("请先取消并等待任务结束，再删除文件。");
    await removeJob(id); return jsonResult({ message: "已删除项目、日志和结果。" });
  } catch (error) { return failure(error); }
}
