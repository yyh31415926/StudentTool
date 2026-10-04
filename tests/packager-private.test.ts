import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADMIN_COOKIE, configureAdminPassword, login, validSession } from "../src/lib/packager/admin";
import { USAGE_COOKIE, privateJobAllowed } from "../src/lib/packager/usage";
import { packagerState, setPackagerEnabled } from "../src/lib/packager/state";
import { requireNewTask } from "../src/lib/packager/access";
import { GET as status } from "../src/app/api/packager/status/route";
import { POST as changeState } from "../src/app/api/packager/admin/state/route";
import { POST as password } from "../src/app/api/packager/admin/usage-password/route";
import { POST as usageLogin, DELETE as usageLogout } from "../src/app/api/packager/usage-session/route";
import { POST as submit } from "../src/app/api/packager/jobs/route";
import { requireAdmin } from "../src/lib/packager/admin";
import { readJob } from "../src/lib/packager/store";

const site = "https://studenttool.example";
const administrator = "DummyAdmin12";
const usagePassword = "DummyFriend6";
let root: string; let adminToken: string;
function request(route: string, body?: unknown, cookie = "", origin = site) {
  return new Request(`${site}/api/packager/${route}`, { method: body === undefined ? "GET" : "POST", headers: { host: "studenttool.example", origin, cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const adminCookie = () => `${ADMIN_COOKIE}=${adminToken}`;
beforeEach(async () => {
  await mkdir("build", { recursive: true }); root = await mkdtemp(path.resolve("build/packager-private-test-"));
  vi.stubEnv("STUDENTTOOL_PACKAGER_ROOT", root);
  await configureAdminPassword(administrator); adminToken = await login(administrator);
  await writeFile(path.join(root, "config.json"), JSON.stringify({ profiles: [{ id: "python-3-12", label: "test Python", executable: "test-only-python.exe", wheelhouse: "test-only-wheels" }] }));
  await writeFile(path.join(root, "heartbeat.json"), JSON.stringify({ at: Date.now(), modes: ["private", "isolated"] }));
});
afterEach(async () => {
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  if (!root.startsWith(path.resolve("build") + path.sep)) throw new Error("Unsafe test cleanup");
  await rm(root, { recursive: true, force: true });
});
async function openPrivate() {
  await configureAdminPassword(usagePassword, "usage");
  const response = await changeState(request("admin/state", { enabled: true }, adminCookie()));
  expect(response.status).toBe(200);
  return login(usagePassword, "usage");
}
describe("private packaging authorization", () => {
  it("defaults to closed private mode and preserves legacy shared mode", async () => {
    expect(await packagerState()).toMatchObject({ mode: "private", enabled: false });
    await writeFile(path.join(root, "state.json"), JSON.stringify({ schemaVersion: 1, enabled: true, updatedAt: 10 }));
    expect(await packagerState()).toMatchObject({ mode: "public", enabled: true });
    expect((await changeState(request("admin/state", { enabled: false, mode: "private" }, adminCookie()))).status).toBe(400);
    await changeState(request("admin/state", { enabled: false }, adminCookie()));
    expect((await changeState(request("admin/state", { enabled: false, mode: "private" }, adminCookie()))).status).toBe(200);
  });
  it("restricts password configuration to same-origin administrators and distinct passwords", async () => {
    const body = { password: usagePassword, confirmation: usagePassword };
    expect((await password(request("admin/usage-password", body))).status).toBe(401);
    expect((await password(request("admin/usage-password", body, adminCookie(), "https://other.example"))).status).toBe(403);
    expect((await password(request("admin/usage-password", { password: administrator, confirmation: administrator }, adminCookie()))).status).toBe(400);
    expect((await password(request("admin/usage-password", body, adminCookie()))).status).toBe(200);
    expect(await readFile(path.join(root, "usage-access.json"), "utf8")).not.toContain(usagePassword);
  });
  it("requires a configured password and a worker supporting private mode", async () => {
    expect((await changeState(request("admin/state", { enabled: true }, adminCookie()))).status).toBe(503);
    await configureAdminPassword(usagePassword, "usage");
    await writeFile(path.join(root, "heartbeat.json"), JSON.stringify({ at: Date.now() }));
    expect((await changeState(request("admin/state", { enabled: true }, adminCookie()))).status).toBe(503);
  });
  it("keeps administrator and visitor permissions separate", async () => {
    const token = await openPrivate();
    expect(await validSession(token)).toBe(false);
    expect(await validSession(adminToken, "usage")).toBe(false);
    await expect(requireAdmin(request("admin/state", undefined, `${ADMIN_COOKIE}=${token}`))).rejects.toThrow();
    await expect(requireNewTask(request("jobs", {}, adminCookie()))).rejects.toThrow("使用密码");
    expect(await requireNewTask(request("jobs", {}, `${USAGE_COOKIE}=${token}`))).toMatchObject({ execution: "private", profileIds: ["python-3-12"] });
  });
  it("issues an HttpOnly visitor cookie and rejects wrong passwords", async () => {
    await openPrivate();
    expect((await usageLogin(request("usage-session", { password: "wrong-dummy" }))).status).toBe(401);
    const response = await usageLogin(request("usage-session", { password: usagePassword }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") || "";
    expect(cookie).toContain(USAGE_COOKIE); expect(cookie.toLowerCase()).toContain("httponly"); expect(cookie.toLowerCase()).toContain("secure"); expect(cookie.toLowerCase()).toContain("samesite=strict");
    const logout = await usageLogout(new Request(`${site}/api/packager/usage-session`, { method: "DELETE", headers: { host: "studenttool.example", origin: site } }));
    expect(logout.headers.get("set-cookie")?.toLowerCase()).toContain("max-age=0");
  });
  it("rejects anonymous uploads before parsing and queues authenticated private jobs", async () => {
    const token = await openPrivate();
    expect((await submit(request("jobs", "invalid upload"))).status).toBe(401);
    const form = new FormData(); form.append("files", new File(["print('trusted test')"], "main.py"));
    form.set("paths", JSON.stringify(["main.py"]));
    form.set("options", JSON.stringify({ entry: "main.py", name: "TrustedTest", pythonId: "python-3-12", output: "onefile", console: true, requirements: "", resources: [], hiddenImports: [], icon: "" }));
    const response = await submit(new Request(`${site}/api/packager/jobs`, { method: "POST", headers: { host: "studenttool.example", origin: site, cookie: `${USAGE_COOKIE}=${token}` }, body: form }));
    expect(response.status).toBe(201);
    const result = await response.json(); const job = await readJob(result.job.id);
    expect(job.execution).toBe("private"); expect(await privateJobAllowed(job)).toBe(true);
    expect(result.job).not.toHaveProperty("usageRevision");
    await setPackagerEnabled(false);
    expect(await privateJobAllowed(job)).toBe(true);
    await expect(requireNewTask(request("jobs", {}, `${USAGE_COOKIE}=${token}`))).rejects.toThrow("已关闭");
    await configureAdminPassword("NextFriend12", "usage");
    expect(await validSession(token, "usage")).toBe(false); expect(await privateJobAllowed(job)).toBe(false);
  });
  it("shows qualification separately from service readiness and expires sessions", async () => {
    const token = await openPrivate();
    const anonymous = await (await status(request("status"))).json();
    expect(anonymous).toMatchObject({ mode: "private", ready: false, serviceReady: true, authorized: false, profiles: [] });
    const qualified = await (await status(request("status", undefined, `${USAGE_COOKIE}=${token}`))).json();
    expect(qualified.ready).toBe(true);
    const now = Date.now(); vi.spyOn(Date, "now").mockReturnValue(now + 8 * 3600_000 + 1);
    expect(await validSession(token, "usage")).toBe(false);
  });
  it("keeps public isolation required even with a private credential", async () => {
    const token = await openPrivate(); await setPackagerEnabled(false, "public");
    expect((await changeState(request("admin/state", { enabled: true }, adminCookie()))).status).toBe(503);
    await setPackagerEnabled(true, "public");
    await expect(requireNewTask(request("jobs", {}, `${USAGE_COOKIE}=${token}`))).rejects.toThrow();
  });
});
