import { configureAdminPassword, requireAdmin } from "@/lib/packager/admin";
import { assertSiteRequest, boundedJson, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSiteRequest(request, true); await requireAdmin(request);
    const body = await boundedJson(request);
    if (!body || typeof body !== "object" || !("password" in body) || !("confirmation" in body) || typeof body.password !== "string" || body.password !== body.confirmation) throw new PackageHttpError("两次使用密码须一致。");
    await configureAdminPassword(body.password, "usage");
    return jsonResult({ configured: true, message: "使用密码已设置，旧使用资格已失效。尚未开始的旧凭证任务将被拒绝。" });
  } catch (error) { return failure(error); }
}
