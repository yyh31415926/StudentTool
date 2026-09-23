import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "StudentTool",
  description: "学生数字工具工作台",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "StudentTool",
    locale: "zh_CN",
    title: "StudentTool",
    description: "学生数字工具工作台",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "StudentTool 学生数字工具工作台" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StudentTool",
    description: "学生数字工具工作台",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
