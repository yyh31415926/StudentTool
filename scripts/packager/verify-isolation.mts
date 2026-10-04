import { getConfig } from "../../src/lib/packager/store";
import { verifyIsolation } from "../../src/lib/packager/isolation";

const config = await getConfig();
const selected = process.argv[2] || config.profiles[0]?.id;
const profile = config.profiles.find(item => item.id === selected);
if (!profile) throw new Error("没有可用的 Python 环境。请先运行 npm run packager:prepare。");
await verifyIsolation(profile);
console.log(`隔离构建真实样例通过，已验证 ${profile.id}。管理页面现在可开启共享打包服务。`);
