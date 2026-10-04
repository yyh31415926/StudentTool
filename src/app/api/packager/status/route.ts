import { assertLocalRequest, failure, jsonResult } from "@/lib/packager/http";
import { getConfig, workerAlive } from "@/lib/packager/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { assertLocalRequest(request); const config = await getConfig(); return jsonResult({ ready: await workerAlive(), localOnly: true, profiles: config.profiles.map(({ id, label }) => ({ id, label })) }); }
  catch (error) { return failure(error); }
}
