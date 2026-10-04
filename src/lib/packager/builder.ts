import { mkdir, writeFile, stat, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { PACKAGE_LIMITS, validatePackageOptions, type PackageJob, type PythonProfile } from "./model";
import { jobDirectory, saveJob } from "./store";
import { buildEnvironment, runCommand } from "./process";

async function projectFiles(root: string, prefix = ""): Promise<{ path: string; size: number }[]> {
  const files: { path: string; size: number }[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const location = path.join(root, entry.name); const info = await lstat(location);
    if (info.isSymbolicLink()) throw new Error("任务目录含链接，已拒绝构建。");
    if (info.isDirectory()) files.push(...await projectFiles(location, `${prefix}${entry.name}/`));
    else if (info.isFile()) files.push({ path: `${prefix}${entry.name}`, size: info.size });
    else throw new Error("项目中存在不支持的特殊文件。");
  }
  return files;
}
export async function buildJob(job: PackageJob, profile: PythonProfile, signal: AbortSignal) {
  const root = jobDirectory(job.id); const project = path.join(root, "project");
  const temporary = path.join(root, "temp"); await mkdir(temporary, { recursive: true });
  const environment = buildEnvironment(temporary);
  let log = ""; let logWrite = Promise.resolve();
  const capture = (chunk: string) => {
    const filtered = chunk.replaceAll(root, "[任务目录]").replaceAll(profile.executable, "[Python]").replace(/https?:\/\/\S+/g, "[下载地址]");
    log = (log + filtered).slice(-128_000);
    const snapshot = log; logWrite = logWrite.then(() => writeFile(path.join(root, "build.log"), snapshot));
  };
  const step = async (status: PackageJob["status"], message: string) => { job.status = status; job.message = message; job.updatedAt = Date.now(); capture(`\n${message}\n`); await logWrite; await saveJob(job); };
  const run = (executable: string, args: string[], cwd = root) => runCommand(executable, args, { cwd, env: environment, signal, log: capture });
  try {
    validatePackageOptions(job.options, await projectFiles(project));
    await step("preparing", "正在创建本任务的独立 Python 环境…");
    await run(profile.executable, ["-I", "-m", "venv", path.join(root, "venv")]);
    const python = path.join(root, "venv", "Scripts", "python.exe");
    await run(python, ["-I", "-m", "pip", "--isolated", "install", "--disable-pip-version-check", "--no-index", "--find-links", profile.wheelhouse, "-r", path.join(profile.wheelhouse, "toolchain.txt")]);
    if (job.options.requirements) {
      await step("installing", "正在从 PyPI 安装已确认的依赖（仅 wheel）…");
      const requirements = path.join(root, "requirements.txt"); await writeFile(requirements, job.options.requirements);
      await run(python, ["-I", "-m", "pip", "--isolated", "install", "--disable-pip-version-check", "--only-binary=:all:", "--index-url", "https://pypi.org/simple", "--cache-dir", path.join(temporary, "pip-cache"), "--timeout", "30", "--retries", "1", "-r", requirements]);
    }
    await step("building", "正在生成 Windows 64 位程序…");
    const args = ["-I", "-m", "PyInstaller", "--noconfirm", "--clean", "--noupx", `--${job.options.output}`, job.options.console ? "--console" : "--windowed", "--name", job.options.name, "--distpath", path.join(root, "dist"), "--workpath", path.join(root, "work"), "--specpath", path.join(root, "spec"), "--paths", project];
    for (const resource of job.options.resources) args.push("--add-data", `${path.join(project, resource)}${path.delimiter}${path.posix.dirname(resource)}`);
    for (const moduleName of job.options.hiddenImports) args.push("--hidden-import", moduleName);
    if (job.options.icon) args.push("--icon", path.join(project, job.options.icon));
    args.push(path.join(project, job.options.entry));
    await run(python, args, project);
    const result = path.join(root, "result"); await mkdir(result);
    // The host's stdlib copies/archives files; generated programs are never executed here.
    const packaging = "import sys,pathlib,shutil\nr=pathlib.Path(sys.argv[1]); n=sys.argv[2]; mode=sys.argv[3]; limit=int(sys.argv[4]); d=r/'dist'; out=r/'result'\nitems=list(d.rglob('*'))\nassert all(not p.is_symlink() for p in items), 'linked result'\nassert sum(p.stat().st_size for p in items if p.is_file())<=limit, 'output size exceeds limit'\nif mode=='onefile': shutil.copyfile(str(d/(n+'.exe')),str(out/(n+'.exe')))\nelse: shutil.make_archive(str(out/n),'zip',str(d),n)\n";
    await run(profile.executable, ["-I", "-c", packaging, root, job.options.name, job.options.output, String(PACKAGE_LIMITS.outputBytes)]);
    const artifact = `${job.options.name}.${job.options.output === "onefile" ? "exe" : "zip"}`;
    const size = (await stat(path.join(result, artifact))).size;
    if (size > PACKAGE_LIMITS.outputBytes) throw new Error("生成结果超过 500 MB 限制。");
    if (signal.aborted) throw new Error("已取消或超时。");
    job.artifact = artifact; job.artifactBytes = size;
    await step("succeeded", "打包完成。请在没有安装 Python 的目标 Windows 电脑上试运行。");
  } catch (error) {
    job.status = signal.aborted ? "cancelled" : "failed";
    job.message = signal.aborted ? typeof signal.reason === "string" ? signal.reason : "任务已取消。" : error instanceof Error ? error.message : "打包失败，请查看日志。";
    job.updatedAt = Date.now(); capture(`\n${job.message}\n`); await logWrite; await saveJob(job);
  } finally { await logWrite; }
}
