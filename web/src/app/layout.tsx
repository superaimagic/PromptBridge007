import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
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
