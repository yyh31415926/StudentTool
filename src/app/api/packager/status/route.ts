import { assertSiteRequest, failure, jsonResult } from "@/lib/packager/http";
import { packageAvailability } from "@/lib/packager/access";
import { usageRevision } from "@/lib/packager/usage";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    assertSiteRequest(request);
    const value = await packageAvailability();
    const authorized = value.state.mode === "public" || Boolean(await usageRevision(request));
    return jsonResult({ mode: value.state.mode, ready: value.ready && authorized, serviceReady: value.ready, authorized, enabled: value.state.enabled, reason: value.reason, profiles: authorized ? value.profiles.map(({ id, label }) => ({ id, label })) : [] });
  }
  catch (error) { return failure(error); }
}
