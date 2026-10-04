"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function UsagePasswordForm({ configured, onSaved }: { configured: boolean; onSaved: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/packager/admin/usage-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, confirmation }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPassword(""); setConfirmation(""); setMessage(body.message); await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "设置使用密码失败。"); }
    finally { setBusy(false); }
  }
  return <section className="archive-panel packager-access-panel space-y-3" aria-label="私人使用密码设置">
    <h2 className="text-lg font-semibold">私人使用密码 · {configured ? "已设置" : "未设置"}</h2>
    <p className="text-sm text-muted-foreground">把使用密码发给信任的朋友；它不能进入管理页。须为 6–12 个字符，且与管理员密码不同。重新设置后，旧使用资格和未开始的旧凭证任务失效；已完成任务仍可凭任务凭证下载。</p>
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1"><span>新的使用密码</span><Input type="password" autoComplete="new-password" required minLength={6} maxLength={12} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
      <label className="block space-y-1"><span>再次输入使用密码</span><Input type="password" autoComplete="new-password" required minLength={6} maxLength={12} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></label>
      <Button type="submit" disabled={busy || !password || !confirmation}>{busy ? "正在保存…" : configured ? "修改使用密码" : "设置使用密码"}</Button>
    </form>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="text-error">{error}</p>}
  </section>;
}
