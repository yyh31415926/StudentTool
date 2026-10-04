"use client";

import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToolUsage } from "../../ToolUsageBoundary";
import { runArchive } from "@/lib/archive/client";
import { ARCHIVE_FORMATS, ARCHIVE_LIMITS, formatArchiveSize, isSupportedArchive, safeArchivePath, validateArchivePlan, type ArchiveFormat, type ArchiveInput, type ArchiveMode, type ArchiveOutput } from "@/lib/tools/archive";

type ResultFile = { name: string; blob: Blob; url: string; directory?: boolean };

export function ArchiveTool({ exampleInput }: { exampleInput: string }) {
  const [mode, setMode] = useState<ArchiveMode>("compress");
  const [format, setFormat] = useState<ArchiveFormat>("zip");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [textName, setTextName] = useState("笔记.txt");
  const [password, setPassword] = useState("");
  const [results, setResults] = useState<ResultFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const urlsRef = useRef<string[]>([]);
  const downloadUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useToolUsage(results.length > 0);

  useEffect(() => () => {
    controllerRef.current?.abort();
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
  }, []);

  function resetOutput() {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    downloadUrlRef.current = null;
    setResults([]);
    setStatus("");
    setError("");
  }

  function addFiles(incoming: File[]) {
    if (busy || !incoming.length) return;
    const combined = [...files, ...incoming];
    if (combined.length > ARCHIVE_LIMITS.entries || combined.reduce((size, file) => size + file.size, 0) > ARCHIVE_LIMITS.inputBytes) {
      setError("最多添加 1000 个文件，输入总大小不能超过 50 MB。");
      return;
    }
    try { combined.forEach((file) => safeArchivePath(file.name)); }
    catch (error) { setError(error instanceof Error ? error.message : "文件名无效。"); return; }
    resetOutput();
    setFiles(combined);
  }

  function paste(event: ClipboardEvent<HTMLDivElement>) {
    if (busy) return;
    const pasted = Array.from(event.clipboardData.files);
    if (pasted.length) { event.preventDefault(); addFiles(pasted); }
    else if (mode === "compress" && !(event.target instanceof HTMLTextAreaElement) && !(event.target instanceof HTMLInputElement)) {
      const value = event.clipboardData.getData("text/plain");
      if (value) { event.preventDefault(); setText((text) => text + value); resetOutput(); }
    }
  }

  function showResults(output: ArchiveOutput[]) {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    const next = output.map(({ name, data, directory }) => {
      const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: "application/octet-stream" });
      return { name, blob, directory, url: URL.createObjectURL(blob) };
    });
    urlsRef.current = next.map(({ url }) => url);
    setResults(next);
    setStatus(next.length ? `处理完成，共 ${next.length} 项。` : "解压完成，压缩包中没有可下载的文件。");
  }

  async function execute() {
    let inputs: ArchiveInput[];
    try {
      inputs = files.map((file) => ({ name: file.name, file }));
      if (mode === "compress" && text.length) inputs.push({ name: textName, file: new Blob([text], { type: "text/plain;charset=utf-8" }) });
      validateArchivePlan({ mode, format, files: inputs.map(({ name, file }) => ({ name, size: file.size })) });
    } catch (error) { setError(error instanceof Error ? error.message : "输入无效。"); return; }
    resetOutput();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setStatus("准备处理…");
    try {
      const output = await runArchive({ mode, format, files: inputs, password }, controller.signal, setStatus);
      if (!controller.signal.aborted) showResults(output);
    } catch (error) {
      if (!controller.signal.aborted) { setStatus(""); setError(error instanceof Error ? error.message : "处理失败，请重试。"); }
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); }
    }
  }

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setStatus("已取消处理，输入内容已保留。");
  }

  async function downloadAll() {
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError("");
    try {
      const output = await runArchive({ mode: "compress", format: "zip", files: results.map(({ name, blob, directory }) => ({ name, file: blob, directory })), repack: true }, controller.signal, setStatus);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([output[0].data.slice().buffer as ArrayBuffer], { type: "application/zip" }));
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = url;
      const link = document.createElement("a");
      link.href = url;
      link.download = "解压结果.zip";
      link.click();
      setStatus("已生成 ZIP 并发起下载，文件夹路径保留。");
    } catch (error) {
      if (!controller.signal.aborted) { setStatus(""); setError(error instanceof Error ? error.message : "打包下载失败，请逐个下载。"); }
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setBusy(false); }
    }
  }

  const single = ARCHIVE_FORMATS.find(({ id }) => id === format)?.single;
  const totalInput = files.reduce((size, file) => size + file.size, 0);
  return <div className="archive-tool space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex gap-2" role="group" aria-label="处理方式">
        {(["compress", "extract"] as const).map((option) => <Button key={option} disabled={busy} aria-pressed={mode === option} variant={mode === option ? "primary" : "secondary"}
          onClick={() => { setMode(option); resetOutput(); }}>{option === "compress" ? "压缩" : "解压"}</Button>)}
      </div>
      {mode === "compress" ? <label className="min-w-0 flex-1 space-y-1"><span>目标格式</span>
        <Select value={format} disabled={busy} onChange={(event) => { setFormat(event.target.value as ArchiveFormat); resetOutput(); }}>
          {ARCHIVE_FORMATS.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
        </Select></label>
        : <label className="min-w-0 flex-1 space-y-1"><span>解压密码（若需要）</span><input type="password" autoComplete="off" value={password} disabled={busy} className="archive-control w-full" onChange={(event) => { setPassword(event.target.value); resetOutput(); }} /></label>}
    </div>
    <p className="text-sm text-muted-foreground">文件仅在当前浏览器处理，不上传、不保存。输入最多 50 MB，解压最多 100 MB / 1000 项。</p>
    <div className="archive-panels">
      <section tabIndex={0} aria-labelledby="archive-input-heading" className={`archive-panel ${dragging ? "archive-dragging" : ""}`} onPaste={paste}
        onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="archive-input-heading" className="text-lg font-semibold">输入</h2><span className="text-sm text-muted-foreground">{files.length} 个文件 · {formatArchiveSize(totalInput)}</span></div>
        <p className="mt-2 text-sm text-muted-foreground">将文件拖入此框，或点击选择文件；框内可粘贴剪贴板文件和图片。</p>
        <input ref={inputRef} type="file" multiple={mode === "compress"} className="sr-only" tabIndex={-1} aria-label="选择待处理文件" disabled={busy}
          accept={mode === "extract" ? ".zip,.7z,.rar,.tar,.gz,.gzip,.tgz,.bz2,.tbz,.tbz2,.xz,.txz" : undefined}
          onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
        <Button variant="secondary" className="my-3" disabled={busy} onClick={() => inputRef.current?.click()}>选择文件</Button>
        <ul className="archive-file-list" aria-label="已添加文件">{files.map((file, index) => <li key={`${index}-${file.name}`} className="archive-file-row">
          <div className="min-w-0"><span className="archive-name">{file.name}</span><span className="block text-sm text-muted-foreground">{formatArchiveSize(file.size)}{mode === "extract" && !isSupportedArchive(file.name) ? " · 不支持的压缩包格式" : ""}</span></div>
          <Button variant="ghost" disabled={busy} aria-label={`移除 ${file.name}`} onClick={() => { setFiles(files.filter((_, i) => i !== index)); resetOutput(); }}>移除</Button>
        </li>)}</ul>
        <label className="mt-3 block space-y-1"><span>文字内容</span><Textarea value={text} disabled={busy || mode === "extract"} onChange={(event) => { setText(event.target.value); resetOutput(); }} placeholder={mode === "compress" ? "直接输入或粘贴文字，将作为文本文件打包。" : "解压需要压缩包文件；切换回压缩后可继续编辑文字。"} /></label>
        {mode === "compress" && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 space-y-1"><span>文字文件名</span><input className="archive-control w-full" value={textName} disabled={busy} onChange={(event) => { setTextName(event.target.value); resetOutput(); }} /></label>
          <Button disabled={busy} variant="ghost" onClick={() => { setText(exampleInput); resetOutput(); }}>填入示例</Button></div>}
        <p className="mt-3 text-sm text-muted-foreground">{mode === "extract" ? "每次解压一个压缩包；RAR 支持解压。" : single ? "当前格式只支持一个文件，文字也计为一个文件。" : "可将多个文件与文字一起打包；同名文件请先重命名。"}</p>
      </section>
      <section className="archive-panel" aria-labelledby="archive-output-heading" aria-busy={busy}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="archive-output-heading" className="text-lg font-semibold">输出</h2>
          {mode === "extract" && results.length > 0 && <Button variant="secondary" disabled={busy} onClick={downloadAll}>打包 ZIP 下载全部</Button>}</div>
        <div role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{status || "处理后的压缩包或解压文件会显示在这里。"}</div>
        <ul className="archive-file-list mt-3" aria-label="处理结果">{results.map(({ name, blob, url, directory }) => <li key={name} className="archive-file-row">
          <div className="min-w-0"><span className="archive-name">{name}</span><span className="block text-sm text-muted-foreground">{directory ? "空文件夹（打包下载时保留）" : formatArchiveSize(blob.size)}</span></div>
          {!directory && <a className="archive-download" href={url} download={name.split("/").pop()} aria-label={`下载 ${name}`}>下载</a>}
        </li>)}</ul>
      </section>
    </div>
    {error && <p role="alert" className="text-error">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy} onClick={execute}>{mode === "compress" ? "开始压缩" : "开始解压"}</Button>
      {busy && <Button variant="secondary" onClick={cancel}>取消处理</Button>}
      <Button variant="ghost" onClick={() => { controllerRef.current?.abort(); controllerRef.current = null; setBusy(false); setFiles([]); setText(""); setPassword(""); resetOutput(); }}>清空</Button>
    </div>
    <p className="text-sm text-muted-foreground">支持解压 ZIP、7z、RAR、TAR、GZ、BZ2、XZ 及 TAR 组合格式。处理时间受文件大小与设备性能影响。<a className="underline" href="/archive/NOTICE.txt" target="_blank" rel="noreferrer">开源引擎与许可</a></p>
  </div>;
}
