import { PackageHttpError } from "./http";
import { isolationReady } from "./isolation";
import { packagerState, type PackageMode } from "./state";
import { getConfig, privateWorkerAlive, workerAlive } from "./store";
import { requireUsage, usagePasswordConfigured } from "./usage";

export async function packageAvailability(modeOverride?: PackageMode) {
  const state = await packagerState();
  const mode = modeOverride || state.mode;
  const [isolation, worker, usageConfigured, config] = await Promise.all([isolationReady(), mode === "private" ? privateWorkerAlive() : workerAlive(), usagePasswordConfigured(), getConfig()]);
  const profiles = config.profiles.filter(profile => mode === "private" || profile.id === isolation.profileId);
  const canEnable = worker && (mode === "private" ? usageConfigured && profiles.length > 0 : isolation.ready);
  const unavailableReason = mode === "private" ? !usageConfigured ? "请先由管理员设置使用密码。" : !profiles.length ? "尚未准备 Python 环境。" : "请启动支持私人模式的打包 Worker。" : !isolation.ready ? isolation.reason : "打包 Worker 尚未启动。";
  const reason = !state.enabled ? "打包服务已关闭，等待管理员开启。" : !canEnable ? unavailableReason : mode === "private" ? "私人打包已开启，请使用密码验证后提交可信项目。" : "公开打包已开启，所有访客可提交。";
  return { state, isolation, worker, usageConfigured, profiles, canEnable, unavailableReason, ready: state.enabled && canEnable, reason };
}
export async function requireNewTask(request?: Request) {
  const availability = await packageAvailability();
  if (!availability.state.enabled) throw new PackageHttpError(availability.reason, 403);
  const revision = availability.state.mode === "private" ? await requireUsage(request) : undefined;
  if (!availability.canEnable) throw new PackageHttpError(availability.unavailableReason, 503);
  return { execution: availability.state.mode === "private" ? "private" as const : "isolated" as const, profileIds: availability.profiles.map(profile => profile.id), usageRevision: revision };
}
