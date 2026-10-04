import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { authorizedJob, cleanupExpired, jobDirectory, publicJob, readJob, removeJob, saveJob, taskToken, workerAlive } from "../src/lib/packager/store";
import { buildEnvironment } from "../src/lib/packager/process";
import type { PackageJob } from "../src/lib/packager/model";

let root: string;
const job = (): PackageJob => ({ id: randomUUID(), tokenHash: taskToken().tokenHash, createdAt: Date.now(), updatedAt: Date.now(), expiresAt: Date.now() + 60_000, status: "queued", options: { entry: "main.py", name: "example", pythonId: "python-3-12", output: "onefile", console: true, requirements: "", resources: [], hiddenImports: [], icon: "" }, message: "queued" });
beforeAll(async () => { await mkdir("build", { recursive: true }); root = await mkdtemp(path.resolve("build/packager-unit-")); vi.stubEnv("STUDENTTOOL_PACKAGER_ROOT", root); });
afterAll(async () => { vi.unstubAllEnvs(); if (!root.startsWith(path.resolve("build") + path.sep)) throw new Error("Test cleanup path mismatch"); await rm(root, { recursive: true, force: true }); });
describe("packager task persistence and lifecycle", () => {
  it("persists tasks and authenticates with the original credential", async () => {
    const credential = taskToken(); const item = { ...job(), tokenHash: credential.tokenHash }; await saveJob(item);
    expect(await readJob(item.id)).toEqual(item);
    expect((await authorizedJob(item.id, credential.token)).id).toBe(item.id);
    await expect(authorizedJob(item.id, "0".repeat(64))).rejects.toThrow();
    const serialized = await readFile(path.join(jobDirectory(item.id), "job.json"), "utf8");
    expect(serialized).not.toContain(credential.token);
    expect(await publicJob(item)).not.toHaveProperty("tokenHash");
  });
  it("expires credentials and cleans only completed tasks", async () => {
    const expired = { ...job(), status: "failed" as const, expiresAt: Date.now() - 1 }; const active = { ...job(), expiresAt: Date.now() - 1 };
    await saveJob(expired); await saveJob(active); await cleanupExpired();
    await expect(readJob(expired.id)).rejects.toThrow(); expect((await readJob(active.id)).status).toBe("queued");
    await expect(authorizedJob(active.id, taskToken().token)).rejects.toThrow();
  });
  it("deletes task contents inside the validated jobs directory", async () => {
    const item = job(); await saveJob(item); await writeFile(path.join(jobDirectory(item.id), "build.log"), "test log"); await removeJob(item.id);
    await expect(readJob(item.id)).rejects.toThrow(); expect(() => jobDirectory("../other")).toThrow();
  });
  it("requires a fresh worker heartbeat", async () => {
    expect(await workerAlive()).toBe(false); await writeFile(path.join(root, "heartbeat.json"), JSON.stringify({ at: Date.now() })); expect(await workerAlive()).toBe(true);
    await writeFile(path.join(root, "heartbeat.json"), JSON.stringify({ at: Date.now() - 16_000 })); expect(await workerAlive()).toBe(false);
  });
  it("builds a minimal child environment using test-only sentinel values", () => {
    vi.stubEnv("PACKAGER_TEST_SECRET", "test-sentinel"); vi.stubEnv("PYTHONPATH", "test-untrusted-path");
    const environment = buildEnvironment(path.join(root, "temp")); expect(environment).not.toHaveProperty("PACKAGER_TEST_SECRET"); expect(environment).not.toHaveProperty("PYTHONPATH"); expect(environment.PYTHONNOUSERSITE).toBe("1");
  });
});
