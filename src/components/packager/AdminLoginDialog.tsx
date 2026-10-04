"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
export function AdminLoginDialog({ onClose }: { onClose: (restoreFocus?: boolean) => void }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null); const router = useRouter();
  useEffect(() => { input.current?.focus(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/packager/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setPassword(""); onClose(false); router.push("/manage"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "登录失败，请重试。"); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <section role="dialog" aria-modal="true" aria-labelledby="admin-login-title" className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 id="admin-login-title" className="text-xl font-semibold">管理员验证</h2>
      <p className="mt-2 text-sm text-muted-foreground">输入管理员密码以打开打包服务管理页面。</p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block space-y-1"><span>管理员密码（6–12 个字符）</span><Input ref={input} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} maxLength={12} /></label>
        {error && <p role="alert" className="text-error">{error}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={busy || !password}>{busy ? "正在验证…" : "进入管理界面"}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => onClose()}>取消</Button></div>
      </form>
    </section>
  </div>;
}
