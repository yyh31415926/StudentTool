import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, validSession } from "@/lib/packager/admin";
import { ManagementPanel } from "@/components/packager/ManagementPanel";
export const dynamic = "force-dynamic";
export const metadata = { title: "打包服务管理 | StudentTool", robots: { index: false, follow: false } };
export default async function ManagePage() {
  if (!await validSession((await cookies()).get(ADMIN_COOKIE)?.value)) notFound();
  return <div className="mx-auto flex w-full max-w-content flex-1 px-page py-page-lg md:px-page-lg"><ManagementPanel /></div>;
}
