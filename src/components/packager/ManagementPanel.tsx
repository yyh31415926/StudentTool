"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UsagePasswordForm } from "./UsagePasswordForm";
type PanelState = { mode: "private" | "public"; enabled: boolean; updatedAt: number; ready: boolean; canEnable: boolean; usageConfigured: boolean; workerReady: boolean; isolationReady: boolean; isolationReason: string; reason: string; unavailableReason: string };
export function ManagementPanel() {
  const [state, setState] = useState<PanelState | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/packager/admin/state", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setState(body); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "无法查询管理状态。"); }
  }, []);
  useEffect(() => { const startup = setTimeout(() => void refresh(), 0); const timer = setInterval(() => void refresh(), 5000); return () => { clearTimeout(startup); clearInterval(timer); }; }, [refresh]);
  async function change(enabled: boolean, mode = state?.mode) {
    setBusy(true); setError("");
    try { const response = await fetch("/api/packager/admin/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, mode }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setState(body); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "修改开关失败。"); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await fetch("/api/packager/admin/session", { method: "DELETE" }); router.replace("/"); router.refresh(); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto w-full max-w-2xl space-y-5" aria-label="打包服务管理">
    <div><p className="text-sm text-muted-foreground">网站管理</p><h1 className="text-2xl font-semibold">打包服务管理</h1><p className="mt-2 text-muted-foreground">开关对当前网站统一生效，私人模式须验证使用密码；状态在网站重启后保留。</p></div>
    <div className="archive-panel space-y-4">
      <h2 className="text-lg font-semibold">服务模式与开关</h2>
      <label className="block space-y-1"><span>服务模式（关闭时可切换）</span><select className="w-full rounded-control border border-border bg-surface p-3" aria-label="服务模式" value={state?.mode || "private"} disabled={busy || !state || state.enabled} onChange={event => void change(false, event.target.value as PanelState["mode"])}><option value="private">私人模式 · 使用密码限制提交</option><option value="public">公开模式 · Windows Sandbox 隔离构建</option></select></label>
      <p role="status">{state ? state.enabled ? state.ready ? state.mode === "private" ? "已开启 · 凭使用密码提交" : "已开启 · 所有访客可提交" : "已开启 · 当前不可用" : "已关闭 · 拒绝新任务" : "正在读取状态…"}</p>
      <p>{state?.reason}</p>
      <dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>{state?.mode === "private" ? "构建方式" : "隔离环境"}</dt><dd>{state?.mode === "private" ? "本机 · 仅可信项目" : state?.isolationReady ? "已验证" : "未就绪"}</dd></div><div className="flex justify-between gap-3"><dt>构建 Worker</dt><dd>{state?.workerReady ? "运行中" : "未运行"}</dd></div></dl>
      {state?.mode === "private" && <p className="text-sm text-muted-foreground">私人模式在本机直接构建，不要求 Windows Sandbox。使用密码只发给信任的朋友；请只接收可信项目。</p>}
      {state?.mode === "public" && !state.isolationReady && <p className="text-sm text-muted-foreground">{state.isolationReason}</p>}
      {state && !state.canEnable && <p className="text-sm text-muted-foreground">{state.unavailableReason}</p>}
      <div className="flex flex-wrap gap-3"><Button disabled={busy || !state || state.enabled || !state.canEnable} onClick={() => change(true)}>开启打包服务</Button><Button variant="secondary" disabled={busy || !state?.enabled} onClick={() => change(false)}>关闭打包服务</Button><Button variant="ghost" disabled={busy} onClick={() => void refresh()}>刷新状态</Button></div>
      {state && state.updatedAt > 0 && <p className="text-sm text-muted-foreground">上次调整：{new Date(state.updatedAt).toLocaleString()}</p>}
    </div>
    {state?.mode === "private" && <UsagePasswordForm configured={state.usageConfigured} onSaved={refresh} />}
    <p className="text-sm text-muted-foreground">关闭后不再接受新任务；已有任务可以凭各自的任务凭证继续查询、下载或取消。切换到公开模式会拒绝尚未开始的私人任务。公开模式要求隔离环境，私人模式要求有效使用资格。</p>
    {error && <p role="alert" className="text-error">{error}</p>}
    <Button variant="ghost" disabled={busy} onClick={logout}>退出管理界面</Button>
  </section>;
}
