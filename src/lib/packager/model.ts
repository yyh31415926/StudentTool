export const PACKAGE_LIMITS = { inputBytes: 50 * 1024 ** 2, uploadBytes: 54 * 1024 ** 2, outputBytes: 500 * 1024 ** 2, files: 1000, queue: 10, timeoutMs: 20 * 60_000, retentionMs: 24 * 3600_000 } as const;
export type PackageOptions = { entry: string; name: string; pythonId: string; output: "onefile" | "onedir"; console: boolean; requirements: string; resources: string[]; hiddenImports: string[]; icon: string };
export type ProjectFile = { path: string; size: number };
export type PackageState = "queued" | "preparing" | "installing" | "building" | "succeeded" | "failed" | "cancelled";
export type PackageJob = { id: string; tokenHash: string; createdAt: number; updatedAt: number; expiresAt: number; status: PackageState; options: PackageOptions; message: string; artifact?: string; artifactBytes?: number };
export type PublicJob = Omit<PackageJob, "tokenHash"> & { queuePosition?: number; log?: string };
export type PythonProfile = { id: string; label: string; executable: string; wheelhouse: string };
export type PackagerConfig = { profiles: PythonProfile[] };
export const PACKAGE_STATUS_LABELS: Record<PackageState, string> = { queued: "等待中", preparing: "准备环境", installing: "安装依赖", building: "构建中", succeeded: "成功", failed: "失败", cancelled: "已取消" };

export function projectPath(value: string): string {
  const path = value.replace(/\\/g, "/");
  if (!path || path.length > 240 || /[\x00-\x1f\x7f<>:"|?*]/.test(path)) throw new Error("项目文件名包含不支持的字符或路径过长。");
  if (path.split("/").some(part => !part || part === "." || part === ".." || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part))) throw new Error("项目路径无效，请移除路径回退、绝对路径或 Windows 保留名称。");
  if (path.split("/").some(part => /^(\.git|\.venv|venv|node_modules|__pycache__)$/i.test(part) || /^\.env(?!\.example$)/i.test(part)) || /\.(pem|key)$/i.test(path)) throw new Error("请移除虚拟环境、缓存、Git 目录、真实环境文件和密钥文件后上传。");
  return path;
}

export function parseRequirements(text: string): string[] {
  if (text.length > 32_000) throw new Error("依赖清单过长。");
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("#"));
  if (lines.length > 100) throw new Error("最多配置 100 项依赖。");
  const requirement = /^[a-z0-9][a-z0-9._-]*(?:\[[a-z0-9._,-]+\])?(?:\s*(?:==|!=|~=|>=|<=|>|<)\s*[a-z0-9.*+_-]+(?:\s*,\s*(?:==|!=|~=|>=|<=|>|<)\s*[a-z0-9.*+_-]+)*)?(?:\s*;\s*[a-z0-9_ .<>=!()'"-]+)?$/i;
  for (const line of lines) {
    if (!requirement.test(line) || /^pyinstaller(?:[-_]|$|\[|\s|[=<>!~])/i.test(line)) throw new Error("依赖只支持 PyPI 包名、版本约束和环境标记，不接受网址、路径、pip 参数或替换打包引擎。");
  }
  return lines;
}

export function validateProject(files: readonly ProjectFile[]): ProjectFile[] {
  if (!files.length || files.length > PACKAGE_LIMITS.files) throw new Error("请添加项目文件，最多 1000 个。");
  const paths = new Set<string>();
  let total = 0;
  const result = files.map(file => {
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new Error("文件信息无效。");
    const path = projectPath(file.path);
    const key = path.toLowerCase();
    if (paths.has(key)) throw new Error(`文件路径重复：${path}。`);
    paths.add(key); total += file.size;
    return { path, size: file.size };
  });
  if (total > PACKAGE_LIMITS.inputBytes) throw new Error("项目展开后总大小不能超过 50 MB。");
  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) if (paths.has(parts.slice(0, i).join("/"))) throw new Error("文件与目录路径冲突。");
  }
  return result;
}

export function validatePackageOptions(input: unknown, files: readonly ProjectFile[]): PackageOptions {
  if (!input || typeof input !== "object") throw new Error("打包配置无效。");
  const options = input as Partial<PackageOptions>;
  const validated = validateProject(files);
  const names = new Set(validated.map(file => file.path));
  if (typeof options.entry !== "string" || !/\.py$/i.test(options.entry) || !names.has(projectPath(options.entry))) throw new Error("请选择项目内存在的 .py 入口文件。");
  if (typeof options.name !== "string" || !/^[\p{L}\p{N}_-]{1,48}$/u.test(options.name)) throw new Error("程序名称使用 1–48 个文字、数字、下划线或短横线。");
  projectPath(options.name);
  if (typeof options.pythonId !== "string" || !/^[a-z0-9-]{1,40}$/.test(options.pythonId)) throw new Error("请选择已配置的 Python 环境。");
  if (options.output !== "onefile" && options.output !== "onedir" || typeof options.console !== "boolean") throw new Error("请选择输出形式和运行方式。");
  if (typeof options.requirements !== "string") throw new Error("依赖清单无效。");
  const requirements = parseRequirements(options.requirements).join("\n");
  if (!Array.isArray(options.resources) || options.resources.length > 1000 || !options.resources.every(item => typeof item === "string" && names.has(projectPath(item)))) throw new Error("资源文件必须来自当前项目。");
  if (new Set(options.resources).size !== options.resources.length) throw new Error("资源文件重复。");
  if (!Array.isArray(options.hiddenImports) || options.hiddenImports.length > 100 || !options.hiddenImports.every(item => typeof item === "string" && /^[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*$/.test(item))) throw new Error("补充模块请填写合法的 Python 模块名。");
  if (typeof options.icon !== "string" || options.icon && (!/\.ico$/i.test(options.icon) || !names.has(projectPath(options.icon)))) throw new Error("图标请选择项目中的 .ico 文件。");
  return { entry: options.entry, name: options.name, pythonId: options.pythonId, output: options.output, console: options.console, requirements, resources: options.resources, hiddenImports: options.hiddenImports, icon: options.icon };
}
