import { NextResponse } from "next/server";
import { PACKAGE_LIMITS } from "./model";

export class PackageHttpError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
function loopback(host: string) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(`http://${host}`).hostname); } catch { return false; }
}
/** Phase one is local only, including reads/downloads. Proxy headers cannot grant access. */
export function assertLocalRequest(request: Request, mutation = false) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || "";
  const proxyHost = request.headers.get("x-forwarded-host");
  const proxyFor = request.headers.get("x-forwarded-for");
  if (!loopback(url.host) || !loopback(host) || proxyHost && proxyHost !== host || proxyFor && proxyFor.split(",").some(ip => !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip.trim())) || ["forwarded", "cf-connecting-ip", "cf-ray"].some(header => request.headers.has(header))) throw new PackageHttpError("程序打包第一阶段仅供本机试用，尚未通过管理页面开放。", 403);
  const origin = request.headers.get("origin");
  if (origin && origin !== `${url.protocol}//${host}` || mutation && !origin) throw new PackageHttpError("请从本机网站页面提交任务。", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new PackageHttpError("不允许跨站访问打包服务。", 403);
}
export function jsonResult(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
export function failure(error: unknown) {
  if (error instanceof PackageHttpError) return jsonResult({ error: error.message }, error.status);
  return jsonResult({ error: error instanceof Error && !/^ENOENT|^EACCES|^EPERM|^EISDIR|^Unexpected token/.test(error.message) ? error.message : "任务不可用，请刷新或重新提交。" }, 400);
}
export async function boundedForm(request: Request) {
  if (!request.body) throw new PackageHttpError("请添加项目文件。");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const item = await reader.read(); if (item.done) break;
      size += item.value.byteLength;
      if (size > PACKAGE_LIMITS.uploadBytes) { await reader.cancel(); throw new PackageHttpError("上传超过 50 MB 项目限制。", 413); }
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") || "" }, body: bytes }).formData();
  } finally { reader.releaseLock(); }
}
