import { createHash, randomUUID } from "node:crypto";
import { access, cp, lstat, mkdir, open, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { PACKAGE_LIMITS, type PackageJob, type PythonProfile } from "./model";
import { buildEnvironment, runCommand } from "./process";
import { GUEST_PYTHON } from "./guest";
import { atomicJson, dataRoot, getConfig, jobDirectory, saveJob, workerAlive } from "./store";

type Verification = { version: 1; profileId: string; fingerprint: string; verifiedAt: number };
const sandboxExe = () => path.join(process.env.SystemRoot || "C:/Windows", "System32", "wsb.exe");
const RUNNER_VERSION = "windows-sandbox-runner-v1";
const fingerprint = (profile: PythonProfile) => createHash("sha256").update(RUNNER_VERSION).update(GUEST_PYTHON).update(profile.executable).update(profile.wheelhouse).update(profile.generation || "legacy-profile").digest("hex");
export async function isolationReady(): Promise<{ ready: boolean; reason: string; profileId?: string }> {
  if (process.platform !== "win32") return { ready: false, reason: "隔离构建需要 Windows 11 24H2+ 的 Windows Sandbox CLI。" };
  try { await access(sandboxExe()); } catch { return { ready: false, reason: "未检测到 Windows Sandbox CLI。需支持该功能的 Windows 11 24H2+；Home 版不支持。" }; }
  let value: Verification;
  try { value = JSON.parse(await readFile(path.join(dataRoot(), "isolation-verified.json"), "utf8")) as Verification; }
  catch { return { ready: false, reason: "隔离环境尚未完成真实构建自检。" }; }
  const profile = (await getConfig()).profiles.find(item => item.id === value.profileId);
  if (!profile || value.version !== 1 || value.fingerprint !== fingerprint(profile)) return { ready: false, reason: "Python 环境或隔离构建代码已变更，请重新自检。" };
  try { await access(path.join(dataRoot(), "engines", profile.id, "guest-python", "python.exe")); }
  catch { return { ready: false, reason: "隔离环境的 Python 运行时缺失，请重新自检。" }; }
  return { ready: true, reason: "Windows Sandbox 隔离构建已通过真实自检。", profileId: profile.id };
}
function xml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
async function guestPython(profile: PythonProfile, refresh = false): Promise<string> {
  const source = path.dirname(profile.executable);
  const target = path.join(dataRoot(), "engines", profile.id, "guest-python");
  if (!refresh) { try { await access(path.join(target, "Lib", "venv", "__init__.py")); return target; } catch { /* Prepare this interpreter. */ } }
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory() && ["Lib", "DLLs", "tcl"].includes(entry.name)) {
      await cp(path.join(source, entry.name), path.join(target, entry.name), { recursive: true, force: true, filter: filename => !/[\\/](site-packages|__pycache__|\.git|\.env[^\\/]*)([\\/]|$)/i.test(filename) && !/\.(pem|key)$/i.test(filename) });
    } else if (entry.isFile() && /^(python(?:3\d*)?\.exe|python3\d*\.dll|python3\.dll|vcruntime\d*\.dll|python\d*\._pth)$/i.test(entry.name)) await cp(path.join(source, entry.name), path.join(target, entry.name), { force: true });
  }
  await access(path.join(target, "Lib", "venv", "__init__.py"));
  return target;
}
async function tail(file: string) {
  try { const info = await stat(file); const size = Math.min(info.size, 128_000); const handle = await open(file, "r"); try { const buffer = Buffer.alloc(size); await handle.read(buffer, 0, size, info.size - size); return buffer.toString("utf8"); } finally { await handle.close(); } }
  catch { return ""; }
}
async function guestStatus(file: string): Promise<{ status: string; message: string; artifact?: string } | null> {
  try { const info = await stat(file); if (info.size > 4_096) return null; const value = JSON.parse(await readFile(file, "utf8")); return typeof value.status === "string" && typeof value.message === "string" ? value : null; } catch { return null; }
}
async function runSandbox(job: PackageJob, profile: PythonProfile, signal: AbortSignal, selfTest = false) {
  const root = jobDirectory(job.id);
  const isolated = path.join(root, "isolated"); const runtime = path.join(isolated, "runtime"); const exchange = path.join(isolated, "exchange"); const wheels = path.join(isolated, "wheels");
  const temporary = path.join(isolated, "temp");
  for (const directory of [runtime, exchange, wheels, temporary]) await mkdir(directory, { recursive: true });
  const update = async (status: PackageJob["status"], message: string) => { job.status = status; job.message = message.slice(0, 500); job.updatedAt = Date.now(); await saveJob(job); };
  await update("preparing", "正在准备隔离构建所需的依赖…");
  if (job.options.requirements) {
    const requirements = path.join(isolated, "requirements.txt"); await writeFile(requirements, job.options.requirements);
    await runCommand(profile.executable, ["-I", "-m", "pip", "--isolated", "download", "--disable-pip-version-check", "--only-binary=:all:", "--index-url", "https://pypi.org/simple", "--dest", wheels, "-r", requirements], { cwd: root, env: buildEnvironment(temporary), signal, log: () => {} });
  }
  await writeFile(path.join(runtime, "guest.py"), GUEST_PYTHON);
  await writeFile(path.join(runtime, "manifest.json"), JSON.stringify({ ...job.options, selfTest }));
  const python = await guestPython(profile, selfTest);
  const mappings = [
    [python, "C:\\Python", true], [profile.wheelhouse, "C:\\Toolchain", true], [path.join(root, "project"), "C:\\Project", true],
    [runtime, "C:\\Runtime", true], [wheels, "C:\\Dependencies", true], [exchange, "C:\\Exchange", false],
  ] as const;
  const mapped = mappings.map(([host, guest, readonly]) => `<MappedFolder><HostFolder>${xml(host)}</HostFolder><SandboxFolder>${guest}</SandboxFolder><ReadOnly>${readonly}</ReadOnly></MappedFolder>`).join("");
  const sandboxConfig = `<Configuration><vGPU>Disable</vGPU><Networking>Disable</Networking><AudioInput>Disable</AudioInput><VideoInput>Disable</VideoInput><PrinterRedirection>Disable</PrinterRedirection><ClipboardRedirection>Disable</ClipboardRedirection><ProtectedClient>Enable</ProtectedClient><MemoryInMB>4096</MemoryInMB><MappedFolders>${mapped}</MappedFolders><LogonCommand><Command>C:\\Python\\python.exe -I C:\\Runtime\\guest.py</Command></LogonCommand></Configuration>`;
  let output = "";
  await runCommand(sandboxExe(), ["start", "--config", sandboxConfig], { cwd: root, env: buildEnvironment(temporary), signal, log: chunk => { output += chunk.slice(0, 10_000); } });
  const sandboxId = output.match(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i)?.[0];
  if (!sandboxId) throw new Error("Windows Sandbox 未返回可识别的会话 ID；请检查隔离服务状态。");
  let stopped = false;
  try {
    for (;;) {
      if (signal.aborted) throw new Error(typeof signal.reason === "string" ? signal.reason : "任务已取消。");
      const status = await guestStatus(path.join(exchange, "status.json"));
      if (status && ["preparing", "installing", "building"].includes(status.status) && status.status !== job.status) await update(status.status as PackageJob["status"], status.message);
      if (status?.status === "failed") throw new Error(status.message);
      if (status?.status === "succeeded") {
        const expected = `${job.options.name}.${job.options.output === "onefile" ? "exe" : "zip"}`;
        if (status.artifact !== expected) throw new Error("隔离环境返回了不匹配的结果。");
        // End the guest before reading writable exchange files, preventing a race with guest code.
        await runCommand(sandboxExe(), ["stop", "--id", sandboxId], { cwd: root, env: buildEnvironment(temporary), log: () => {} });
        stopped = true;
        const source = path.join(exchange, expected); const info = await lstat(source);
        if (!info.isFile() || info.isSymbolicLink() || info.size > PACKAGE_LIMITS.outputBytes || path.dirname(await realpath(source)) !== await realpath(exchange)) throw new Error("隔离结果文件无效或过大。");
        const handle = await open(source, "r"); let prefix: Buffer;
        try { prefix = Buffer.alloc(2); await handle.read(prefix, 0, 2, 0); } finally { await handle.close(); }
        if (prefix.toString() !== (job.options.output === "onefile" ? "MZ" : "PK")) throw new Error("隔离结果格式无效。");
        await mkdir(path.join(root, "result"), { recursive: true });
        await cp(source, path.join(root, "result", expected));
        job.artifact = expected; job.artifactBytes = info.size;
        await update("succeeded", status.message);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } finally {
    const result = await tail(path.join(exchange, "build.log"));
    await writeFile(path.join(root, "build.log"), result).catch(() => {});
    if (!stopped) await runCommand(sandboxExe(), ["stop", "--id", sandboxId], { cwd: root, env: buildEnvironment(temporary), log: () => {} }).catch(() => {});
  }
}
export async function buildIsolatedJob(job: PackageJob, profile: PythonProfile, signal: AbortSignal, selfTest = false) {
  try { await runSandbox(job, profile, signal, selfTest); }
  catch (error) {
    job.status = signal.aborted ? "cancelled" : "failed";
    job.message = signal.aborted ? typeof signal.reason === "string" ? signal.reason : "任务已取消。" : error instanceof Error ? error.message.slice(0, 500) : "隔离构建失败。";
    job.updatedAt = Date.now(); await saveJob(job);
  }
}
export async function verifyIsolation(profile: PythonProfile) {
  await access(sandboxExe());
  if (await workerAlive()) throw new Error("请先正常停止 Worker，再运行隔离自检。");
  await atomicJson(path.join(dataRoot(), "isolation-verified.json"), { version: 1, profileId: "", fingerprint: "", verifiedAt: 0 } satisfies Verification);
  const id = randomUUID(); const root = jobDirectory(id); await mkdir(path.join(root, "project"), { recursive: true });
  await writeFile(path.join(root, "project", "main.py"), "from pathlib import Path\nprint('SANDBOX_CHECK ' + Path(__file__).with_name('data.txt').read_text())\n");
  await writeFile(path.join(root, "project", "data.txt"), "RESOURCE_OK");
  const now = Date.now();
  const job: PackageJob = { id, tokenHash: "0".repeat(64), createdAt: now, updatedAt: now, expiresAt: now + PACKAGE_LIMITS.retentionMs, status: "queued", message: "隔离自检", execution: "isolated", options: { entry: "main.py", name: "SandboxCheck", pythonId: profile.id, output: "onefile", console: true, requirements: "", resources: ["data.txt"], hiddenImports: [], icon: "" } };
  await saveJob(job);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort("隔离自检超时。"), PACKAGE_LIMITS.timeoutMs);
  try {
    await buildIsolatedJob(job, profile, controller.signal, true);
    if (job.status !== "succeeded" || !job.artifact) throw new Error(`隔离自检失败：${job.message}`);
    await atomicJson(path.join(dataRoot(), "isolation-verified.json"), { version: 1, profileId: profile.id, fingerprint: fingerprint(profile), verifiedAt: Date.now() } satisfies Verification);
  } finally { clearTimeout(timeout); }
}
