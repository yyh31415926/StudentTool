import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, rename, readdir, rm, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { PACKAGE_LIMITS, type PackageJob, type PackagerConfig, type PublicJob } from "./model";

// Runtime private data must not be traced into Next.js deployment artifacts.
export const dataRoot = () => path.resolve(/* turbopackIgnore: true */ process.env.STUDENTTOOL_PACKAGER_ROOT || path.join(process.cwd(), "private/packager"));
export const jobDirectory = (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("任务不存在。");
  return path.join(dataRoot(), "jobs", id);
};
export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, file);
}
export async function getConfig(): Promise<PackagerConfig> {
  try { return JSON.parse(await readFile(path.join(dataRoot(), "config.json"), "utf8")) as PackagerConfig; }
  catch { return { profiles: [] }; }
}
export async function listJobs(): Promise<PackageJob[]> {
  try {
    const entries = await readdir(path.join(dataRoot(), "jobs"), { withFileTypes: true });
    const result = await Promise.all(entries.filter(entry => entry.isDirectory() && /^[a-f0-9-]{36}$/.test(entry.name)).map(entry => readJob(entry.name).catch(() => null)));
    return result.filter((job): job is PackageJob => job !== null).sort((a, b) => a.createdAt - b.createdAt);
  } catch { return []; }
}
export const readJob = async (id: string): Promise<PackageJob> => JSON.parse(await readFile(path.join(jobDirectory(id), "job.json"), "utf8"));
export const saveJob = (job: PackageJob) => atomicJson(path.join(jobDirectory(job.id), "job.json"), job);
export function taskToken() { const token = randomBytes(32).toString("hex"); return { token, tokenHash: createHash("sha256").update(token).digest("hex") }; }
export async function authorizedJob(id: string, token: string): Promise<PackageJob> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("任务不存在或访问凭证无效。");
  const job = await readJob(id);
  const digest = createHash("sha256").update(token).digest();
  const expected = Buffer.from(job.tokenHash, "hex");
  if (expected.length !== digest.length || !timingSafeEqual(expected, digest) || job.expiresAt <= Date.now()) throw new Error("任务不存在、已过期或访问凭证无效。");
  return job;
}
export async function publicJob(job: PackageJob): Promise<PublicJob> {
  const { tokenHash: omitted, ...publicFields } = job;
  void omitted;
  let log = "";
  try { log = await readFile(path.join(jobDirectory(job.id), "build.log"), "utf8"); } catch { /* No log yet. */ }
  const queued = (await listJobs()).filter(item => item.status === "queued");
  return { ...publicFields, queuePosition: job.status === "queued" ? queued.findIndex(item => item.id === job.id) + 1 : undefined, log };
}
export async function workerAlive(): Promise<boolean> {
  try { const beat = JSON.parse(await readFile(path.join(dataRoot(), "heartbeat.json"), "utf8")); return Date.now() - beat.at < 15_000; }
  catch { return false; }
}
export async function removeJob(id: string) {
  const directory = jobDirectory(id);
  const root = await realpath(path.join(dataRoot(), "jobs"));
  const info = await lstat(directory);
  if (info.isSymbolicLink() || path.dirname(await realpath(directory)) !== root) throw new Error("任务目录异常，无法删除。");
  await rm(directory, { recursive: true, force: true });
}
export async function cleanupExpired() {
  for (const job of await listJobs()) if (job.expiresAt <= Date.now() && ["succeeded", "failed", "cancelled"].includes(job.status)) await removeJob(job.id);
}
export function jobDeadline() { return Date.now() + PACKAGE_LIMITS.retentionMs; }
