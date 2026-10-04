import { describe, it, expect } from "vitest";
import { parseRequirements, projectPath, validatePackageOptions, validateProject, type PackageOptions } from "../src/lib/packager/model";
import { assertLocalRequest } from "../src/lib/packager/http";
import { parseReceipt } from "../src/lib/packager/receipt";
const options: PackageOptions = { entry: "main.py", name: "示例", pythonId: "python-3-8", output: "onefile", console: true, requirements: "", resources: [], hiddenImports: [], icon: "" };
describe("package validation and local access boundaries", () => {
  it("restores a well formed task receipt and rejects malformed or oversized receipts", () => {
    const receipt = { version: 1, id: "12345678-1234-1234-1234-123456789abc", token: "a".repeat(64) };
    expect(parseReceipt(JSON.stringify(receipt))).toEqual(receipt);
    for (const text of ["null", "{}", "a".repeat(1025), JSON.stringify({ ...receipt, id: "../private" })]) expect(() => parseReceipt(text)).toThrow();
  });
  it.each(["../main.py", "/main.py", "C:\\main.py", "a/CON.txt", "a//b.py", "a./b.py", ".env.local", "venv/main.py", "private.key"])("rejects unsafe project %s", value => expect(() => projectPath(value)).toThrow());
  it("accepts Unicode nested project names", () => expect(projectPath("项目/src/main.py")).toBe("项目/src/main.py"));
  it("rejects case insensitive duplicates", () => expect(() => validateProject([{ path: "main.py", size: 1 }, { path: "MAIN.py", size: 1 }])).toThrow());
  it("rejects file/directory conflict", () => expect(() => validateProject([{ path: "src", size: 1 }, { path: "src/main.py", size: 1 }])).toThrow());
  it("rejects oversized content", () => expect(() => validateProject([{ path: "main.py", size: 51 * 1024 ** 2 }])).toThrow());
  it.each(["--index-url https://example.com", "thing @ https://example.com/a.whl", "-r other.txt", "../package", "PyInstaller==1"])("rejects dependency instructions %s", value => expect(() => parseRequirements(value)).toThrow());
  it("accepts ordinary dependencies and markers", () => expect(parseRequirements('# note\nrequests>=2.0,<3\ncolorama==0.4.6; sys_platform == "win32"')).toHaveLength(2));
  it("requires existing entry and resources", () => { expect(() => validatePackageOptions({ ...options, resources: ["absent.txt"] }, [{ path: "main.py", size: 10 }])).toThrow(); expect(validatePackageOptions(options, [{ path: "main.py", size: 10 }]).entry).toBe("main.py"); });
  it.each(["../bad", "bad name", "CON"])("rejects invalid output name %s", name => expect(() => validatePackageOptions({ ...options, name }, [{ path: "main.py", size: 1 }])).toThrow());
  it("allows local same origin POST", () => expect(() => assertLocalRequest(new Request("http://127.0.0.1:4004/api/packager/jobs", { headers: { host: "127.0.0.1:4004", origin: "http://127.0.0.1:4004" } }), true)).not.toThrow());
  it("rejects tunnel origin", () => expect(() => assertLocalRequest(new Request("http://127.0.0.1:4004/api/packager/jobs", { headers: { host: "example.trycloudflare.com", origin: "https://example.trycloudflare.com" } }), true)).toThrow());
  it("rejects cross origin and missing mutation origin", () => { for (const origin of ["https://example.com", ""]) expect(() => assertLocalRequest(new Request("http://127.0.0.1:4004/api/packager/jobs", { headers: { host: "127.0.0.1:4004", ...(origin ? { origin } : {}) } }), true)).toThrow(); });
  it("rejects forwarded remote IP even if host is rewritten", () => expect(() => assertLocalRequest(new Request("http://127.0.0.1:4004/api/packager/status", { headers: { host: "127.0.0.1:4004", "x-forwarded-for": "203.0.113.5" } }))).toThrow());
  it("accepts Next local proxy headers", () => expect(() => assertLocalRequest(new Request("http://localhost:4004/api/packager/jobs", { headers: { host: "127.0.0.1:4004", origin: "http://127.0.0.1:4004", "x-forwarded-host": "127.0.0.1:4004", "x-forwarded-for": "::ffff:127.0.0.1" } }), true)).not.toThrow());
});
