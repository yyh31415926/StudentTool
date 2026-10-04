import { configureAdminPassword } from "../../src/lib/packager/admin";

if (!process.stdin.isTTY || !process.stdin.setRawMode) throw new Error("请在本机交互式终端设置密码。");
function hidden(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const finish = (error?: Error) => {
      process.stdin.off("data", input); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n");
      if (error) reject(error); else resolve(Buffer.concat(chunks).toString("utf8"));
    };
    const input = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) { finish(new Error("已取消设置。")); return; }
        if (byte === 13 || byte === 10) { finish(); return; }
        if (byte === 8 || byte === 127) { const last = chunks.pop(); if (last && last.length > 1) chunks.push(last.subarray(0, -1)); continue; }
        if (Buffer.concat(chunks).length >= 1024) { finish(new Error("输入过长。")); return; }
        chunks.push(Buffer.from([byte]));
      }
    };
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on("data", input);
  });
}
const password = await hidden("设置管理员密码（6–12 个字符，输入不回显）：");
const confirmation = await hidden("再次输入管理员密码：");
if (password !== confirmation) throw new Error("两次密码不一致，未保存。");
await configureAdminPassword(password);
console.log("管理员密码已设置，旧管理会话已失效。密码不会显示在终端或写入源码。");
