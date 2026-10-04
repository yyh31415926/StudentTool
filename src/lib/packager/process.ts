import { spawn } from "node:child_process";
import path from "node:path";

/** Read only this allowlist; website secrets and Python user configuration never reach builds. */
export function buildEnvironment(temporary: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of ["SystemRoot", "WINDIR", "PATH", "PATHEXT", "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS"]) if (process.env[key]) environment[key] = process.env[key];
  return { ...environment, TEMP: temporary, TMP: temporary, HOME: temporary, USERPROFILE: temporary, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", PYTHONNOUSERSITE: "1", PIP_CONFIG_FILE: path.join(temporary, "no-pip-config"), PYINSTALLER_CONFIG_DIR: path.join(temporary, "pyinstaller-cache") };
}
export async function runCommand(executable: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; signal?: AbortSignal; log?: (text: string) => void }) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { cwd: options.cwd, env: options.env, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let settled = false;
    const abort = () => {
      if (process.platform === "win32" && child.pid) {
        // This PID comes from our own spawned child; kill only its tree.
        spawn(path.join(process.env.SystemRoot || "C:/Windows", "System32/taskkill.exe"), ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, shell: false, stdio: "ignore" });
      } else child.kill("SIGKILL");
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", chunk => options.log?.(Buffer.from(chunk).toString("utf8")));
    child.stderr.on("data", chunk => options.log?.(Buffer.from(chunk).toString("utf8")));
    const finish = (error?: Error) => {
      if (settled) return; settled = true; options.signal?.removeEventListener("abort", abort);
      if (error) reject(error); else resolve();
    };
    child.on("error", () => finish(new Error("无法启动构建组件，请检查 Python 路径和准备环境。")));
    child.on("close", code => finish(options.signal?.aborted ? new Error("已取消或超时。") : code === 0 ? undefined : new Error("构建组件返回失败，请查看日志中的原因。")));
    if (options.signal?.aborted) abort();
  });
}
