import { requireAdmin } from "@/lib/packager/admin";
import { packageAvailability } from "@/lib/packager/access";
import { assertSiteRequest, boundedJson, failure, jsonResult, PackageHttpError } from "@/lib/packager/http";
import { setPackagerEnabled } from "@/lib/packager/state";
export const runtime = "nodejs";
async function snapshot() {
  const value = await packageAvailability();
  return { mode: value.state.mode, enabled: value.state.enabled, updatedAt: value.state.updatedAt, ready: value.ready, canEnable: value.canEnable, workerReady: value.worker, usageConfigured: value.usageConfigured, isolationReady: value.isolation.ready, isolationReason: value.isolation.reason, reason: value.reason, unavailableReason: value.unavailableReason };
}
export async function GET(request: Request) {
  try { assertSiteRequest(request); await requireAdmin(request); return jsonResult(await snapshot()); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    assertSiteRequest(request, true); await requireAdmin(request);
    const input = await boundedJson(request);
    if (!input || typeof input !== "object" || !("enabled" in input) || typeof input.enabled !== "boolean") throw new PackageHttpError("开关状态无效。");
    const current = await packageAvailability();
    const mode = "mode" in input ? input.mode : current.state.mode;
    if (mode !== "private" && mode !== "public") throw new PackageHttpError("服务模式无效。");
    if (mode !== current.state.mode && (current.state.enabled || input.enabled)) throw new PackageHttpError("请先关闭服务，再切换模式。");
    if (input.enabled) {
      const availability = await packageAvailability(mode);
      if (!availability.canEnable) throw new PackageHttpError(availability.unavailableReason, 503);
    }
    await setPackagerEnabled(input.enabled, mode);
    return jsonResult(await snapshot());
  } catch (error) { return failure(error); }
}
