"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function PrivateAccessPanel({ authorized, serviceReady, onChange }: { authorized: boolean; serviceReady: boolean; onChange: () => Promise<void> }) {
  const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function authenticate(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/packager/usage-session", authorized ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setPassword(""); await onChange();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "验证失败，请重试。"); }
    finally { setBusy(false); }
  }
  return <section className="archive-panel packager-access-panel space-y-3" aria-label="私人打包验证">
    <h2 className="text-lg font-semibold">私人打包 · {authorized ? "使用资格已验证" : "需要使用密码"}</h2>
    <p className="text-sm text-muted-foreground">项目将在网站所在电脑直接构建。使用密码仅限制提交人员，没有安全沙箱；只上传你自己或信任朋友的项目。验证资格有效 8 小时，管理员修改使用密码后须重新验证。</p>
    {authorized ? <Button variant="secondary" disabled={busy} onClick={() => void authenticate()}>退出私人使用资格</Button> : <form onSubmit={authenticate} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 space-y-1"><span>使用密码（6–12 个字符）</span><Input type="password" autoComplete="off" required minLength={6} maxLength={12} value={password} onChange={event => setPassword(event.target.value)} disabled={busy || !serviceReady} /></label>
      <Button type="submit" disabled={busy || !serviceReady || !password}>{busy ? "正在验证…" : "验证使用资格"}</Button>
    </form>}
    {!serviceReady && <p className="text-sm text-muted-foreground">等待管理员开启并准备好打包服务后，可在这里验证。</p>}
    {error && <p role="alert" className="text-error">{error}</p>}
  </section>;
}
