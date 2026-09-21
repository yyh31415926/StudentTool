import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudentTool",
  description: "学生数字工具工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
