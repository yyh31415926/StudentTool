import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { ADMIN_COOKIE, configureAdminPassword, login, validSession } from "../src/lib/packager/admin";
import { assertSiteRequest } from "../src/lib/packager/http";
import { packagerState, setPackagerEnabled } from "../src/lib/packager/state";
import { requireNewTask } from "../src/lib/packager/access";
import { GET, POST } from "../src/app/api/packager/admin/state/route";

let root: string;
const site = "https://studenttool.example";
const request = (method: string, token?: string, origin = site) => new Request(`${site}/api/packager/admin/state`, {
  method,
  headers: { host: "studenttool.example", origin, ...(token ? { cookie: `${ADMIN_COOKIE}=${token}` } : {}), ...(method === "POST" ? { "content-type": "application/json" } : {}) },
  ...(method === "POST" ? { body: JSON.stringify({ enabled: true }) } : {}),
});

beforeAll(async () => {
  await mkdir("build", { recursive: true });
  root = await mkdtemp(path.resolve("build/packager-admin-test-"));
  vi.stubEnv("STUDENTTOOL_PACKAGER_ROOT", root);
});
afterAll(async () => {
  vi.unstubAllEnvs();
  if (!root.startsWith(path.resolve("build") + path.sep)) throw new Error("Test cleanup path mismatch");
  await rm(root, { recursive: true, force: true });
});

describe("packager administrator and shared gate", () => {
  it("persists a closed default and later choices", async () => {
    expect((await packagerState()).enabled).toBe(false);
    await setPackagerEnabled(true);
    expect((await packagerState()).enabled).toBe(true);
    await setPackagerEnabled(false);
    expect((await packagerState()).enabled).toBe(false);
  });
  it("accepts the configured password, rotates sessions, and blocks repeated guesses", async () => {
    const first = "DummyAdmin6";
    await configureAdminPassword(first);
    const token = await login(first);
    expect(await validSession(token)).toBe(true);
    expect(await validSession(`${token.slice(0, -1)}${token.at(-1) === "0" ? "1" : "0"}`)).toBe(false);
    for (let attempt = 0; attempt < 7; attempt++) await expect(login("wrong-test-password")).rejects.toThrow("密码不正确");
    await expect(login("wrong-test-password")).rejects.toThrow("密码不正确");
    await expect(login(first)).rejects.toThrow("尝试次数过多");
    await configureAdminPassword("DummyAdmin12");
    expect(await validSession(token)).toBe(false);
    expect(await validSession(await login("DummyAdmin12"))).toBe(true);
  });
  it("requires an administrator session and same origin for state changes", async () => {
    const token = await login("DummyAdmin12");
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await GET(request("GET", token))).status).toBe(200);
    expect((await POST(request("POST"))).status).toBe(401);
    expect((await POST(request("POST", token, "https://other.example"))).status).toBe(403);
    expect((await POST(request("POST", token))).status).toBe(503);
    expect((await packagerState()).enabled).toBe(false);
  });
  it("fails closed for public submissions without verified isolation", async () => {
    await setPackagerEnabled(true);
    await expect(requireNewTask()).rejects.toThrow();
    await setPackagerEnabled(false);
  });
  it("accepts a matching HTTPS proxy origin and rejects malformed forwarding", () => {
    const proxied = new Request("http://127.0.0.1:3000/api/packager/admin/state", { headers: { host: "127.0.0.1:3000", "x-forwarded-host": "studenttool.example", "x-forwarded-proto": "https", origin: site } });
    expect(() => assertSiteRequest(proxied, true)).not.toThrow();
    const malformed = new Request(site, { headers: { host: "studenttool.example", "x-forwarded-host": "[bad", origin: site } });
    expect(() => assertSiteRequest(malformed, true)).toThrow();
    const insecure = new Request("http://studenttool.example/api/packager/jobs", { headers: { host: "studenttool.example", origin: "http://studenttool.example" } });
    expect(() => assertSiteRequest(insecure, true)).toThrow();
  });
});
