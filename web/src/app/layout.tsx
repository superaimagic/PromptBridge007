import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptBridge007 - 跨平台提示词管理系统 | 词桥007",
  description:
    "开源的跨平台AI提示词管理系统，支持20+工具一键部署，MCP协议接入，环境自动扫描。一次创建，处处部署。",
  keywords: [
    "PromptBridge007",
    "提示词管理",
    "AI工具",
    "跨平台部署",
    "MCP",
    "开源",
  ],
  openGraph: {
    title: "PromptBridge007 - 跨平台提示词管理系统",
    description:
      "开源的跨平台AI提示词管理系统，支持20+工具一键部署，MCP协议接入，环境自动扫描。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col scroll-smooth">
        {children}
      </body>
    </html>
  );
}
