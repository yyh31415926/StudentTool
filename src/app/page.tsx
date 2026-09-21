import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-1 items-start px-page py-page-lg md:px-page-lg">
      <Card className="w-full">
        <p className="text-sm font-medium text-muted-foreground">
          学生数字工具工作台
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          StudentTool
        </h1>
        <p className="mt-4 max-w-prose text-base text-muted-foreground">
          基础网站框架已就绪。
        </p>
      </Card>
    </div>
  );
}
