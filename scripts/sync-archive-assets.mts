import { build } from "esbuild";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const destination = path.join(root, "public/archive");
await mkdir(destination, { recursive: true });
for (const [source, target] of [["7zz.umd.js", "7zz.js"], ["7zz.wasm", "7zz.wasm"], ["License.txt", "License.txt"], ["unRarLicense.txt", "unRarLicense.txt"]]) {
  await copyFile(path.join(root, "node_modules/7z-wasm", source), path.join(destination, target));
}
await writeFile(path.join(destination, "NOTICE.txt"), "7z-wasm 1.2.0 — unmodified 7-Zip 24.09 WASM binary and loader.\nCopyright Igor Pavlov and contributors. LGPL-2.1-or-later + unRAR restriction; see License.txt and unRarLicense.txt.\nCorresponding source and build instructions: https://github.com/use-strict/7z-wasm ; original 7-Zip source: https://www.7-zip.org/a/7z2409-src.tar.xz\nThe Worker bundle is generated from src/lib/archive/archive.worker.ts by npm run archive:assets.\n");
await build({ entryPoints: [path.join(root, "src/lib/archive/archive.worker.ts")], outfile: path.join(destination, "archive.worker.js"), bundle: true, platform: "browser", format: "iife", target: "es2020", minify: true, legalComments: "inline" });
console.log("Archive Worker, WASM and license notices prepared.");
