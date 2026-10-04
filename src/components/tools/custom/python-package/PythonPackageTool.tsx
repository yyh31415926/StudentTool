"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { PACKAGE_STATUS_LABELS, validatePackageOptions, validateProject, type PackageOptions, type PublicJob } from "@/lib/packager/model";
import { useToolUsage } from "../../ToolUsageBoundary";
import { PackageSettings } from "./PackageSettings";
import { droppedFiles, metadata, unpackInputs, type UploadedFile } from "./project-input";
import { parseReceipt } from "@/lib/packager/receipt";
const defaults: PackageOptions = { entry: "", name: "我的程序", pythonId: "", output: "onefile", console: true, requirements: "", resources: [], hiddenImports: [], icon: "" };
type Ticket = { token: string; job: PublicJob };
export function PythonPackageTool() {
  const [files, setFiles] = useState<UploadedFile[]>([]); const [options, setOptions] = useState(defaults);
  const [profiles, setProfiles] = useState<{ id: string; label: string }[]>([]); const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("正在检查本机打包服务…"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]); const fileInput = useRef<HTMLInputElement>(null); const directoryInput = useRef<HTMLInputElement>(null);
  const receiptInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true); const polls = useRef<AbortController | null>(null);
  useToolUsage(tickets.some(ticket => ticket.job.status === "succeeded"));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; polls.current?.abort(); }; }, []);
  async function status() {
    try { const response = await fetch("/api/packager/status", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error);
      setProfiles(body.profiles); setReady(body.ready); setNotice(body.ready ? "本机试用阶段 · 单任务构建，其余排队。" : "本机服务尚未就绪。请在本机执行准备与 Worker 启动命令。");
      setOptions(value => ({ ...value, pythonId: value.pythonId || body.profiles[0]?.id || "" }));
    } catch (error) { setReady(false); setNotice(error instanceof Error ? error.message : "无法查询本机服务。"); }
  }
  useEffect(() => { let active = true; const controller = new AbortController();
    void fetch("/api/packager/status", { cache: "no-store", signal: controller.signal }).then(async response => { const body = await response.json(); if (!active) return;
      if (!response.ok) { setNotice(body.error); return; } setProfiles(body.profiles); setReady(body.ready); setOptions(value => ({ ...value, pythonId: body.profiles[0]?.id || "" })); setNotice(body.ready ? "本机试用阶段 · 单任务构建，其余排队。" : "本机服务尚未就绪。请先准备并启动打包服务。");
    }).catch(() => { if (active) setNotice("无法连接本机打包服务。"); }); return () => { active = false; controller.abort(); };
  }, []);
  useEffect(() => {
    if (!tickets.length) return;
    const controller = new AbortController(); polls.current = controller; let running = false;
    const timer = setInterval(() => { if (running) return; running = true;
      void Promise.all(tickets.map(async ticket => { try { const response = await fetch(`/api/packager/jobs/${ticket.job.id}`, { headers: { "x-task-token": ticket.token }, cache: "no-store", signal: controller.signal }); const body = await response.json(); if (!response.ok) return ticket; return { ...ticket, job: body as PublicJob }; } catch { return ticket; } })).then(next => { if (!controller.signal.aborted) setTickets(next); }).finally(() => { running = false; });
    }, 2000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [tickets]);
  async function add(incoming: UploadedFile[]) {
    setBusy(true); setError("");
    try { const expanded = await unpackInputs(incoming); const combined = [...files, ...expanded]; validateProject(metadata(combined));
      if (!mounted.current) return;
      const requirements = combined.find(item => /(^|\/)requirements\.txt$/i.test(item.path));
      const text = requirements && !options.requirements ? await requirements.file.text() : options.requirements;
      setFiles(combined); setOptions(value => ({ ...value, entry: value.entry || combined.find(item => /(^|\/)main\.py$/i.test(item.path))?.path || combined.find(item => /\.py$/i.test(item.path))?.path || "", requirements: text.replace(/^\uFEFF/, ""), resources: [...new Set([...value.resources, ...expanded.filter(item => !/\.(py|pyw)$/i.test(item.path) && !/(^|\/)requirements[^/]*\.txt$/i.test(item.path)).map(item => item.path)])] }));
    } catch (error) { setError(error instanceof Error ? error.message : "读取项目失败。"); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function submit() {
    setBusy(true); setError("");
    try { const valid = validatePackageOptions(options, metadata(files)); const form = new FormData(); form.set("options", JSON.stringify(valid)); form.set("paths", JSON.stringify(files.map(item => item.path))); files.forEach(item => form.append("files", item.file));
      const response = await fetch("/api/packager/jobs", { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error);
      if (mounted.current) { setTickets(value => [{ job: body.job, token: body.token }, ...value]); setNotice("任务已提交。离开页面前可保存任务凭证，下次导入凭证继续查看和下载。"); }
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "提交失败。"); } finally { if (mounted.current) setBusy(false); }
  }
  async function action(ticket: Ticket, method: "POST" | "DELETE") {
    try { const response = await fetch(`/api/packager/jobs/${ticket.job.id}`, { method, headers: { "x-task-token": ticket.token } }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setNotice(body.message); if (method === "DELETE") setTickets(value => value.filter(item => item.job.id !== ticket.job.id)); }
    catch (error) { setError(error instanceof Error ? error.message : "操作失败。"); }
  }
  function downloadForm(ticket: Ticket, kind: "result" | "log") {
    return <form method="post" action={`/api/packager/jobs/${ticket.job.id}/download`}><input type="hidden" name="token" value={ticket.token} /><input type="hidden" name="kind" value={kind} /><Button variant="secondary" type="submit">{kind === "log" ? "下载日志" : "下载程序"}</Button></form>;
  }
  function saveReceipt(ticket: Ticket) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, id: ticket.job.id, token: ticket.token })], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${ticket.job.options.name}-任务凭证.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restoreReceipt(file: File) {
    try {
      if (file.size > 1024) throw new Error("任务凭证文件过大。");
      const receipt = parseReceipt(await file.text());
      const response = await fetch(`/api/packager/jobs/${receipt.id}`, { headers: { "x-task-token": receipt.token }, cache: "no-store" });
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      if (mounted.current) { setTickets(value => [{ token: receipt.token, job: body }, ...value.filter(item => item.job.id !== receipt.id)]); setNotice("已恢复任务。凭证可访问项目结果和日志，请妥善保存。"); }
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "无法恢复任务。"); }
  }
  return <div className="package-tool space-y-4">
    <div role="status" className="rounded-control bg-surface-muted p-4"><p>{notice}</p><Button variant="ghost" onClick={status}>刷新服务状态</Button></div>
    <p className="text-sm text-muted-foreground">项目将发送到当前网站的 Windows 构建电脑，临时保存 24 小时。仅处理你信任的项目；输入最多 50 MB / 1000 项。请勿上传密码或密钥。</p>
    <div className="archive-panels">
      <section tabIndex={0} aria-label="项目输入" className="archive-panel space-y-3" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) { void droppedFiles(event.dataTransfer.items).then(add).catch(error => setError(error.message)); } }} onPaste={event => { const incoming = Array.from(event.clipboardData.files); if (incoming.length && !busy) { event.preventDefault(); void add(incoming.map(file => ({ path: file.name, file }))); } }}>
        <h2 className="text-lg font-semibold">项目文件</h2><p className="text-sm text-muted-foreground">拖入项目、文件夹或 ZIP；也可选择或粘贴文件。文件夹会保留相对路径。</p>
        <input className="sr-only" tabIndex={-1} type="file" multiple ref={fileInput} aria-label="项目文件选择器" onChange={event => { void add(Array.from(event.target.files || []).map(file => ({ path: file.name, file }))); event.target.value = ""; }} />
        <input className="sr-only" tabIndex={-1} type="file" multiple ref={directoryInput} aria-label="项目文件夹选择器" {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)} onChange={event => { void add(Array.from(event.target.files || []).map(file => ({ path: file.webkitRelativePath || file.name, file }))); event.target.value = ""; }} />
        <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>选择文件 / ZIP</Button><Button variant="secondary" disabled={busy} onClick={() => directoryInput.current?.click()}>选择文件夹</Button><Button variant="ghost" disabled={busy} onClick={() => { void add([{ path: "main.py", file: new File(['from pathlib import Path\nprint("程序打包示例：你好！")\n'], "main.py") }]); }}>填入示例</Button></div>
        <p className="text-sm">{files.length} 个文件 · {(files.reduce((sum, item) => sum + item.file.size, 0) / 1024 ** 2).toFixed(2)} MB</p>
        <ul className="archive-file-list">{files.map(item => <li className="archive-file-row" key={item.path}><span className="archive-name min-w-0">{item.path}</span><Button variant="ghost" disabled={busy} aria-label={`移除 ${item.path}`} onClick={() => { setFiles(files.filter(file => file.path !== item.path)); setOptions(value => ({ ...value, entry: value.entry === item.path ? "" : value.entry, icon: value.icon === item.path ? "" : value.icon, resources: value.resources.filter(resource => resource !== item.path) })); }}>移除</Button></li>)}</ul>
        <Button variant="ghost" disabled={busy} onClick={() => { setFiles([]); setOptions({ ...defaults, pythonId: options.pythonId }); setError(""); }}>清空项目</Button>
      </section>
      <section className="archive-panel"><PackageSettings options={options} setOptions={setOptions} files={files} profiles={profiles} disabled={busy} /></section>
    </div>
    {error && <p role="alert" className="text-error">{error}</p>}
    <Button disabled={busy || !ready || !files.length} onClick={submit}>{busy ? "正在处理项目…" : "开始打包"}</Button>
    <section aria-label="打包任务" className="space-y-3"><h2 className="text-lg font-semibold">任务与结果</h2><input className="sr-only" tabIndex={-1} type="file" accept=".json" ref={receiptInput} aria-label="任务凭证选择器" onChange={event => { const file = event.target.files?.[0]; if (file) void restoreReceipt(file); event.target.value = ""; }} /><Button variant="secondary" onClick={() => receiptInput.current?.click()}>导入任务凭证</Button>{!tickets.length && <p>提交后的状态、日志和下载入口显示在这里。</p>}{tickets.map(ticket => <article key={ticket.job.id} className="archive-panel space-y-3">
      <h3 className="font-semibold">{ticket.job.options.name} · {PACKAGE_STATUS_LABELS[ticket.job.status]}{ticket.job.queuePosition ? ` · 排队第 ${ticket.job.queuePosition} 位` : ""}</h3><p role="status">{ticket.job.message}</p><p className="text-sm text-muted-foreground">结果于 {new Date(ticket.job.expiresAt).toLocaleString()} 过期；保存凭证后可恢复任务，请勿分享凭证。</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => saveReceipt(ticket)}>保存任务凭证</Button>{ticket.job.status === "succeeded" && downloadForm(ticket, "result")}{ticket.job.log && downloadForm(ticket, "log")}{["succeeded", "failed", "cancelled"].includes(ticket.job.status) ? <Button variant="ghost" onClick={() => action(ticket, "DELETE")}>删除任务文件</Button> : <Button variant="secondary" onClick={() => action(ticket, "POST")}>取消任务</Button>}</div>
      <details><summary className="cursor-pointer min-h-touch">查看构建日志</summary><pre className="archive-file-list whitespace-pre-wrap break-words text-sm">{ticket.job.log || "暂无日志。"}</pre></details>
    </article>)}</section>
    <p className="text-sm text-muted-foreground">程序依赖的外部服务、驱动和数据库可能仍需另行配置。打包不会自动给脚本添加图形界面；单文件运行时可能先解包。完成后请在客户电脑上试运行。</p>
  </div>;
}
