import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { PackageOptions } from "@/lib/packager/model";
import type { UploadedFile } from "./project-input";
export function PackageSettings({ options, setOptions, files, profiles, disabled }: { options: PackageOptions; setOptions: (options: PackageOptions) => void; files: UploadedFile[]; profiles: { id: string; label: string }[]; disabled: boolean }) {
  const update = (value: Partial<PackageOptions>) => setOptions({ ...options, ...value });
  return <fieldset disabled={disabled} className="space-y-4 min-w-0"><legend className="text-lg font-semibold mb-3">打包配置</legend>
    <label className="block space-y-1"><span>入口文件</span><Select value={options.entry} onChange={event => update({ entry: event.target.value })}><option value="">请选择 .py 入口</option>{files.filter(item => /\.py$/i.test(item.path)).map(item => <option key={item.path}>{item.path}</option>)}</Select></label>
    <label className="block space-y-1"><span>Python 环境</span><Select value={options.pythonId} onChange={event => update({ pythonId: event.target.value })}><option value="">请选择已配置环境</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</Select></label>
    <p className="text-sm text-muted-foreground">目标：Windows 10/11 · 64 位。列表只显示本机已准备的 Python 版本。</p>
    <label className="block space-y-1"><span>程序名称</span><input className="archive-control w-full" value={options.name} onChange={event => update({ name: event.target.value })} maxLength={48} /></label>
    <label className="block space-y-1"><span>输出形式</span><Select value={options.output} onChange={event => update({ output: event.target.value as PackageOptions["output"] })}><option value="onefile">单个 EXE（便于发送，启动时会解包）</option><option value="onedir">程序文件夹（ZIP 下载，解压后运行）</option></Select></label>
    <label className="block space-y-1"><span>运行方式</span><Select value={String(options.console)} onChange={event => update({ console: event.target.value === "true" })}><option value="true">命令行脚本（显示终端和输出）</option><option value="false">窗口程序（隐藏终端）</option></Select></label>
    <label className="block space-y-1"><span>依赖清单</span><Textarea value={options.requirements} onChange={event => update({ requirements: event.target.value })} placeholder="例如：requests==2.32.3，每行一项。读取 requirements.txt 后请确认。" /></label>
    <p className="text-sm text-muted-foreground">仅支持 PyPI 的 wheel 包。网址、本地包和需要源码编译的依赖暂不支持。</p>
    <details><summary className="cursor-pointer min-h-touch">资源、图标与补充模块</summary><div className="space-y-3 mt-3">
      <fieldset><legend>随程序附带的资源（保留相对路径）</legend><div className="archive-file-list">{files.filter(item => !/\.(py|pyw)$/i.test(item.path) && !/(^|\/)requirements[^/]*\.txt$/i.test(item.path)).map(item => <label className="flex items-center gap-2 min-h-touch" key={item.path}><input type="checkbox" checked={options.resources.includes(item.path)} onChange={event => update({ resources: event.target.checked ? [...options.resources, item.path] : options.resources.filter(resource => resource !== item.path) })} /><span className="archive-name min-w-0">{item.path}</span></label>)}</div></fieldset>
      <label className="block space-y-1"><span>程序图标（可选 ICO）</span><Select value={options.icon} onChange={event => update({ icon: event.target.value })}><option value="">使用默认图标</option>{files.filter(item => /\.ico$/i.test(item.path)).map(item => <option key={item.path}>{item.path}</option>)}</Select></label>
      <label className="block space-y-1"><span>补充模块（每行一个，用于动态导入）</span><Textarea value={options.hiddenImports.join("\n")} onChange={event => update({ hiddenImports: event.target.value.split(/\r?\n/) })} onBlur={event => update({ hiddenImports: event.target.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean) })} /></label>
    </div></details>
  </fieldset>;
}
