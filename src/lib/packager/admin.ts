import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { atomicJson, dataRoot } from "./store";

const SESSION_MS = 8 * 60 * 60_000;
const FAILURE_WINDOW_MS = 15 * 60_000;
const FAILURE_LIMIT = 8;
export const ADMIN_COOKIE = "st_packager_admin";
export class AdminError extends Error { constructor(message: string, readonly status = 401) { super(message); } }
type AdminRecord = { version: 1; salt: string; passwordHash: string; sessionKey: string; createdAt: number };
type LoginFailures = { count: number; firstAt: number; blockedUntil: number };
export type CredentialScope = "admin" | "usage";
const recordFile = (scope: CredentialScope) => scope === "admin" ? "admin.json" : "usage-access.json";
const failureFile = (scope: CredentialScope) => scope === "admin" ? "login-failures.json" : "usage-login-failures.json";
const PASSWORD_LIMITS = { min: 6, max: 12 };

function derivedPassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, "hex"), 64, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
async function config(scope: CredentialScope = "admin"): Promise<AdminRecord> {
  let value: AdminRecord;
  try { value = JSON.parse(await readFile(path.join(dataRoot(), recordFile(scope)), "utf8")) as AdminRecord; }
  catch { throw new AdminError(scope === "admin" ? "管理员密码尚未设置，请在网站电脑上运行 npm run packager:admin-setup。" : "使用密码尚未设置，请联系管理员。", 503); }
  if (value.version !== 1 || !/^[a-f0-9]{32}$/.test(value.salt) || !/^[a-f0-9]{128}$/.test(value.passwordHash) || !/^[a-f0-9]{64}$/.test(value.sessionKey)) throw new AdminError(scope === "admin" ? "管理员配置无效，请在网站电脑上重新设置密码。" : "使用密码配置无效，请联系管理员重新设置。", 503);
  return value;
}
export async function hasAdminPassword(scope: CredentialScope = "admin") { try { await config(scope); return true; } catch { return false; } }
export async function passwordRevision(scope: CredentialScope) { return (await config(scope)).salt; }
export async function configureAdminPassword(password: string, scope: CredentialScope = "admin") {
  const limits = PASSWORD_LIMITS;
  if (password.length < limits.min || password.length > limits.max || /[\x00-\x1f\x7f]/.test(password)) throw new AdminError(`${scope === "admin" ? "管理员密码" : "使用密码"}须为 ${limits.min}–${limits.max} 个字符，不能包含控制字符。`, 400);
  const salt = randomBytes(16).toString("hex");
  const passwordHash = (await derivedPassword(password, salt)).toString("hex");
  if (scope === "usage") {
    const administrator = await config();
    if (timingSafeEqual(Buffer.from(administrator.passwordHash, "hex"), await derivedPassword(password, administrator.salt))) throw new AdminError("使用密码必须与管理员密码不同。", 400);
  } else if (await hasAdminPassword("usage")) {
    const usage = await config("usage");
    if (timingSafeEqual(Buffer.from(usage.passwordHash, "hex"), await derivedPassword(password, usage.salt))) throw new AdminError("管理员密码必须与使用密码不同。", 400);
  }
  await atomicJson(path.join(dataRoot(), recordFile(scope)), { version: 1, salt, passwordHash, sessionKey: randomBytes(32).toString("hex"), createdAt: Date.now() } satisfies AdminRecord);
  await atomicJson(path.join(dataRoot(), failureFile(scope)), { count: 0, firstAt: 0, blockedUntil: 0 } satisfies LoginFailures);
}
async function failures(scope: CredentialScope): Promise<LoginFailures> {
  try { const value = JSON.parse(await readFile(path.join(dataRoot(), failureFile(scope)), "utf8")) as LoginFailures; return Number.isSafeInteger(value.count) && Number.isFinite(value.firstAt) && Number.isFinite(value.blockedUntil) ? value : { count: 0, firstAt: 0, blockedUntil: 0 }; }
  catch { return { count: 0, firstAt: 0, blockedUntil: 0 }; }
}
const loginGates = { admin: Promise.resolve(), usage: Promise.resolve() };
export async function login(password: string, scope: CredentialScope = "admin"): Promise<string> {
  let release = () => {};
  const previous = loginGates[scope]; loginGates[scope] = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const record = await config(scope);
    const state = await failures(scope); const now = Date.now();
    if (state.blockedUntil > now) throw new AdminError("密码尝试次数过多，请 15 分钟后再试。", 429);
    const expected = Buffer.from(record.passwordHash, "hex");
    const limits = PASSWORD_LIMITS;
    const candidate = typeof password === "string" && password.length >= limits.min && password.length <= limits.max && !/[\x00-\x1f\x7f]/.test(password) ? await derivedPassword(password, record.salt) : Buffer.alloc(64);
    if (!timingSafeEqual(expected, candidate)) {
      const count = now - state.firstAt < FAILURE_WINDOW_MS ? state.count + 1 : 1;
      await atomicJson(path.join(dataRoot(), failureFile(scope)), { count, firstAt: count === 1 ? now : state.firstAt, blockedUntil: count >= FAILURE_LIMIT ? now + FAILURE_WINDOW_MS : 0 } satisfies LoginFailures);
      throw new AdminError("密码不正确。", 401);
    }
    await atomicJson(path.join(dataRoot(), failureFile(scope)), { count: 0, firstAt: 0, blockedUntil: 0 } satisfies LoginFailures);
    const payload = `${randomBytes(16).toString("hex")}.${now + SESSION_MS}`;
    return `${payload}.${createHmac("sha256", Buffer.from(record.sessionKey, "hex")).update(payload).digest("hex")}`;
  } finally { release(); }
}
export async function validSession(value: string | undefined, scope: CredentialScope = "admin"): Promise<boolean> {
  return Boolean(await sessionRevision(value, scope));
}
export async function sessionRevision(value: string | undefined, scope: CredentialScope): Promise<string | null> {
  if (!value || !/^[a-f0-9]{32}\.[0-9]{13}\.[a-f0-9]{64}$/.test(value)) return null;
  const [nonce, expiry, signature] = value.split(".");
  if (Number(expiry) <= Date.now() || Number(expiry) > Date.now() + SESSION_MS) return null;
  try {
    const record = await config(scope);
    const expected = createHmac("sha256", Buffer.from(record.sessionKey, "hex")).update(`${nonce}.${expiry}`).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex")) ? record.salt : null;
  } catch { return null; }
}
export async function requireAdmin(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  if (!await validSession(cookie)) throw new AdminError("请先输入管理员密码。", 401);
}
export const adminSessionSeconds = SESSION_MS / 1000;
