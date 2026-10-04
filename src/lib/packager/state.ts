import { readFile } from "node:fs/promises";
import path from "node:path";
import { atomicJson, dataRoot } from "./store";

export type PackageMode = "private" | "public";
export type PackagerState = { schemaVersion: 2; mode: PackageMode; enabled: boolean; updatedAt: number };
const closed: PackagerState = { schemaVersion: 2, mode: "private", enabled: false, updatedAt: 0 };
export async function packagerState(): Promise<PackagerState> {
  try {
    const value = JSON.parse(await readFile(path.join(dataRoot(), "state.json"), "utf8"));
    // Never migrate a shared switch into permission to execute on the host.
    if (value?.schemaVersion === 1 && typeof value.enabled === "boolean") return { ...closed, mode: "public", enabled: value.enabled, updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0 };
    if (value?.schemaVersion === 2 && ["private", "public"].includes(value.mode) && typeof value.enabled === "boolean") return { schemaVersion: 2, mode: value.mode, enabled: value.enabled, updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0 };
  } catch { /* Missing or corrupt state fails closed. */ }
  return { ...closed };
}
export async function setPackagerEnabled(enabled: boolean, mode?: PackageMode): Promise<PackagerState> {
  const current = await packagerState();
  const value: PackagerState = { schemaVersion: 2, mode: mode || current.mode, enabled, updatedAt: Date.now() };
  await atomicJson(path.join(dataRoot(), "state.json"), value);
  return value;
}
