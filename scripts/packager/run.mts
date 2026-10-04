import { build } from "esbuild";
import { spawn } from "node:child_process";
import path from "node:path";
const mode = process.argv[2];
if (mode !== "prepare" && mode !== "worker") throw new Error("请选择 prepare 或 worker。");
const target = path.resolve(`private/packager/runtime/${mode}.mjs`);
await build({ entryPoints: [path.resolve(`scripts/packager/${mode}.mts`)], outfile: target, bundle: true, platform: "node", format: "esm", target: "node22" });
const child = spawn(process.execPath, [target, ...process.argv.slice(3)], { stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true, shell: false });
const stop = () => {
  // Windows kill(SIGINT) forcefully terminates Node; IPC lets the worker clean up.
  if (mode === "worker" && child.connected) child.send({ type: "stop" }, () => {});
  else child.kill("SIGTERM");
};
process.on("SIGINT", stop); process.on("SIGTERM", stop);
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
