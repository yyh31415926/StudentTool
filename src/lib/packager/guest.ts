// Trusted source copied into one Windows Sandbox task. The uploaded project is data.
export const GUEST_PYTHON = String.raw`import json
import os
import pathlib
import shutil
import subprocess
import sys
import zipfile

project = pathlib.Path("C:/Project")
exchange = pathlib.Path("C:/Exchange")
manifest = json.loads(pathlib.Path("C:/Runtime/manifest.json").read_text(encoding="utf-8"))
work = pathlib.Path("C:/Work")
work.mkdir(exist_ok=True)
(work / "temp").mkdir(exist_ok=True)
environment = {key: value for key, value in os.environ.items() if key.upper() in ("SYSTEMROOT", "WINDIR", "PATH", "PATHEXT", "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS")}
environment.update({"TEMP": str(work / "temp"), "TMP": str(work / "temp"), "USERPROFILE": str(work), "HOME": str(work), "PYTHONNOUSERSITE": "1", "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8", "PIP_CONFIG_FILE": str(work / "no-pip-config"), "PYINSTALLER_CONFIG_DIR": str(work / "pyinstaller-cache")})

def update(status, message, artifact=None):
    value = {"status": status, "message": message, "artifact": artifact}
    temporary = exchange / "status.tmp"
    temporary.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    os.replace(temporary, exchange / "status.json")

def run(args):
    with (exchange / "build.log").open("ab") as output:
        result = subprocess.run(args, cwd=work, env=environment, stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT, check=False)
    if result.returncode:
        raise RuntimeError("构建组件失败，请查看日志。")

try:
    update("preparing", "正在隔离环境中准备 Python…")
    run(["C:/Python/python.exe", "-I", "-m", "venv", str(work / "venv")])
    python = str(work / "venv/Scripts/python.exe")
    run([python, "-I", "-m", "pip", "--isolated", "install", "--disable-pip-version-check", "--no-index", "--find-links", "C:/Toolchain", "-r", "C:/Toolchain/toolchain.txt"])
    if manifest["requirements"]:
        update("installing", "正在隔离环境中安装项目依赖…")
        requirements = work / "requirements.txt"
        requirements.write_text(manifest["requirements"], encoding="utf-8")
        run([python, "-I", "-m", "pip", "--isolated", "install", "--disable-pip-version-check", "--no-index", "--find-links", "C:/Dependencies", "-r", str(requirements)])
    update("building", "正在隔离环境中生成 Windows 程序…")
    args = [python, "-I", "-m", "PyInstaller", "--noconfirm", "--clean", "--noupx", "--" + manifest["output"], "--console" if manifest["console"] else "--windowed", "--name", manifest["name"], "--distpath", str(work / "dist"), "--workpath", str(work / "build"), "--specpath", str(work / "spec"), "--paths", str(project)]
    for resource in manifest["resources"]:
        args += ["--add-data", str(project / resource) + os.pathsep + str(pathlib.PurePosixPath(resource).parent)]
    for module in manifest["hiddenImports"]:
        args += ["--hidden-import", module]
    if manifest["icon"]:
        args += ["--icon", str(project / manifest["icon"])]
    args.append(str(project / manifest["entry"]))
    run(args)
    dist = work / "dist"
    members = list(dist.rglob("*"))
    if any(item.is_symlink() for item in members):
        raise RuntimeError("生成结果包含链接。")
    if sum(item.stat().st_size for item in members if item.is_file()) > 500 * 1024 * 1024:
        raise RuntimeError("生成结果超过 500 MiB 限制。")
    artifact = manifest["name"] + (".exe" if manifest["output"] == "onefile" else ".zip")
    target = exchange / artifact
    if manifest["output"] == "onefile":
        shutil.copyfile(dist / artifact, target)
    else:
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for item in (dist / manifest["name"]).rglob("*"):
                if item.is_file():
                    archive.write(item, str(pathlib.Path(manifest["name"]) / item.relative_to(dist / manifest["name"])))
    if target.stat().st_size > 500 * 1024 * 1024:
        raise RuntimeError("生成结果超过 500 MiB 限制。")
    if manifest.get("selfTest"):
        sample = subprocess.run([str(dist / artifact)], cwd=work, env=environment, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30, check=False)
        if sample.returncode or b"SANDBOX_CHECK RESOURCE_OK" not in sample.stdout:
            raise RuntimeError("隔离样例程序运行失败。")
    update("succeeded", "隔离构建完成。请在目标 Windows 电脑试运行。", artifact)
except Exception as error:
    with (exchange / "build.log").open("a", encoding="utf-8") as output:
        output.write("\n" + str(error) + "\n")
    update("failed", str(error))
`;
