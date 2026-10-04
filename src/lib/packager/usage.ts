import { AdminError, hasAdminPassword, passwordRevision, sessionRevision } from "./admin";
import type { PackageJob } from "./model";
import { packagerState } from "./state";

export const USAGE_COOKIE = "st_packager_usage";
export const usagePasswordConfigured = () => hasAdminPassword("usage");
export async function usageRevision(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${USAGE_COOKIE}=`))?.slice(USAGE_COOKIE.length + 1);
  return sessionRevision(value, "usage");
}
export async function requireUsage(request?: Request) {
  const revision = request && await usageRevision(request);
  if (!revision) throw new AdminError("请先输入使用密码，取得私人打包资格。");
  return revision;
}
export async function privateJobAllowed(job: PackageJob) {
  if (job.execution !== "private" || !job.usageRevision || (await packagerState()).mode !== "private") return false;
  try { return job.usageRevision === await passwordRevision("usage"); } catch { return false; }
}
