import { lstat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { assertSiteRequest, boundedForm, failure, PackageHttpError } from "@/lib/packager/http";
import { authorizedJob, jobDirectory } from "@/lib/packager/store";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSiteRequest(request, true); const { id } = await context.params;
    const form = await boundedForm(request, 4096); const job = await authorizedJob(id, String(form.get("token") || ""));
    const log = form.get("kind") === "log";
    if (!log && (job.status !== "succeeded" || !job.artifact)) throw new PackageHttpError("打包结果尚未生成。");
    const filename = log ? "build.log" : job.artifact!;
    if (path.basename(filename) !== filename) throw new PackageHttpError("下载文件无效。");
    const location = path.join(jobDirectory(id), log ? "build.log" : `result/${filename}`);
    const info = await lstat(location); if (!info.isFile() || info.isSymbolicLink()) throw new PackageHttpError("下载文件不可用。");
    return new Response(Readable.toWeb(createReadStream(location)) as ReadableStream, { headers: { "Content-Type": log ? "text/plain;charset=utf-8" : "application/octet-stream", "Content-Disposition": `attachment; filename="${log ? "build.log" : "program" + path.extname(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`, "Content-Length": String(info.size), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return failure(error); }
}
