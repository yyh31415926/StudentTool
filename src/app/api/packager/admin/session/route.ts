import { ADMIN_COOKIE, adminSessionSeconds, login } from "@/lib/packager/admin";
import { assertSiteRequest, boundedJson, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const scope = assertSiteRequest(request, true);
    const body = await boundedJson(request);
    if (!body || typeof body !== "object" || !("password" in body) || typeof body.password !== "string") throw new PackageHttpError("请输入管理员密码。");
    const token = await login(body.password);
    const response = jsonResult({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: scope.secure, sameSite: "strict", path: "/", maxAge: adminSessionSeconds });
    return response;
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const scope = assertSiteRequest(request, true);
    const response = jsonResult({ authenticated: false });
    response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: scope.secure, sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return failure(error); }
}
