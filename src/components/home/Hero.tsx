import { ToolSearch } from "./ToolSearch";
import type { SearchableTool } from "./search-tools";

type HeroProps = {
  tools: readonly SearchableTool[];
};

/**
 * 首页首屏（Hero）。
 *
 * 服务端组件：产品名称与一句话介绍留在服务端生成（保证 SEO 文案可被读取），
 * 搜索入口由客户端组件 ToolSearch 承担。数据由服务端从注册表取好后传入。
 */
export function Hero({ tools }: HeroProps) {
  return (
    <section aria-labelledby="hero-heading">
      <p className="text-sm font-medium text-muted-foreground">
        学生数字工具工作台
      </p>
      <h1
        className="mt-2 text-3xl font-semibold tracking-tight"
        id="hero-heading"
      >
        StudentTool
      </h1>
      <p className="mt-4 max-w-prose text-base text-muted-foreground">
        打开就能用，用完不用管。选择一个工具开始处理手头的任务。
      </p>

      <div className="mt-6 max-w-xl">
        <ToolSearch tools={tools} />
      </div>
    </section>
  );
}
