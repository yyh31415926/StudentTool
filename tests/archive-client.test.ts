import { afterEach, describe, expect, it, vi } from "vitest";
import { runArchive } from "../src/lib/archive/client";
import { ARCHIVE_LIMITS, type ArchiveResponse } from "../src/lib/tools/archive";

class TestWorker {
  static latest: TestWorker;
  onmessage: ((event: { data: ArchiveResponse }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() { TestWorker.latest = this; }
  respond(data: ArchiveResponse) { this.onmessage?.({ data }); }
}
const request = { mode: "compress" as const, format: "zip" as const, files: [{ name: "a.txt", file: new Blob(["a"]) }] };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("archive Worker lifecycle", () => {
  it("reports status and transfers results before terminating", async () => {
    vi.stubGlobal("Worker", TestWorker);
    const status = vi.fn();
    const promise = runArchive(request, new AbortController().signal, status);
    const worker = TestWorker.latest;
    worker.respond({ type: "status", message: "正在压缩" });
    expect(status).toHaveBeenCalledWith("正在压缩");
    expect(worker.terminate).not.toHaveBeenCalled();
    worker.respond({ type: "result", files: [{ name: "a.zip", data: new Uint8Array([1]) }] });
    expect(await promise).toHaveLength(1);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("cancels the Worker and rejects without leaving it running", async () => {
    vi.stubGlobal("Worker", TestWorker);
    const controller = new AbortController();
    const promise = runArchive(request, controller.signal, () => {});
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(TestWorker.latest.terminate).toHaveBeenCalledOnce();
  });
  it("does not instantiate a Worker for an already canceled request", async () => {
    const constructor = vi.fn();
    vi.stubGlobal("Worker", constructor);
    const controller = new AbortController(); controller.abort();
    await expect(runArchive(request, controller.signal, () => {})).rejects.toMatchObject({ name: "AbortError" });
    expect(constructor).not.toHaveBeenCalled();
  });
  it("terminates on timeout", async () => {
    vi.useFakeTimers(); vi.stubGlobal("Worker", TestWorker);
    const promise = runArchive(request, new AbortController().signal, () => {});
    const assertion = expect(promise).rejects.toThrow("两分钟");
    vi.advanceTimersByTime(ARCHIVE_LIMITS.timeoutMs);
    await assertion;
    expect(TestWorker.latest.terminate).toHaveBeenCalledOnce();
  });
  it("terminates and reports engine errors", async () => {
    vi.stubGlobal("Worker", TestWorker);
    const promise = runArchive(request, new AbortController().signal, () => {});
    TestWorker.latest.respond({ type: "error", message: "密码错误" });
    await expect(promise).rejects.toThrow("密码错误");
    expect(TestWorker.latest.terminate).toHaveBeenCalledOnce();
  });
  it("terminates on a Worker loading failure", async () => {
    vi.stubGlobal("Worker", TestWorker);
    const promise = runArchive(request, new AbortController().signal, () => {});
    TestWorker.latest.onerror?.();
    await expect(promise).rejects.toThrow("加载或运行失败");
    expect(TestWorker.latest.terminate).toHaveBeenCalledOnce();
  });
  it("cleans up if sending input to the Worker throws", async () => {
    class BrokenWorker extends TestWorker {
      postMessage = vi.fn(() => { throw new DOMException("Cannot clone", "DataCloneError"); });
    }
    vi.stubGlobal("Worker", BrokenWorker);
    await expect(runArchive(request, new AbortController().signal, () => {})).rejects.toThrow("重新选择");
    expect(TestWorker.latest.terminate).toHaveBeenCalledOnce();
  });
});
