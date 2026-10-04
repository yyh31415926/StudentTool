import { adminSessionSeconds, login } from "@/lib/packager/admin";
import { packageAvailability } from "@/lib/packager/access";
import { assertSiteRequest, boundedJson, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
import { USAGE_COOKIE } from "@/lib/packager/usage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const scope = assertSiteRequest(request, true);
    const value = await packageAvailability();
    if (value.state.mode !== "private" || !value.state.enabled) throw new PackageHttpError("私人打包服务未开启。", 403);
    if (!value.canEnable) throw new PackageHttpError(value.unavailableReason, 503);
    const body = await boundedJson(request);
    if (!body || typeof body !== "object" || !("password" in body) || typeof body.password !== "string") throw new PackageHttpError("请输入使用密码。");
    const token = await login(body.password, "usage");
    const response = jsonResult({ authorized: true });
    response.cookies.set(USAGE_COOKIE, token, { httpOnly: true, secure: scope.secure, sameSite: "strict", path: "/", maxAge: adminSessionSeconds });
    return response;
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const scope = assertSiteRequest(request, true);
    const response = jsonResult({ authorized: false });
    response.cookies.set(USAGE_COOKIE, "", { httpOnly: true, secure: scope.secure, sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return failure(error); }
}
