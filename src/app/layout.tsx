import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "无锡旅商智能练测系统",
  description: "无锡旅游商贸高等职业技术学校 · 智能题库练测平台",
  applicationName: "旅商练测",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "旅商练测",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // 旧版 iOS(<16.4) 靠此 meta 才能以全屏 standalone 启动（新版走 manifest 的 display:standalone）
  other: { "apple-mobile-web-app-capable": "yes" },
};

// 移动端 viewport：禁用缩放（输入框聚焦放大由 globals.css 的 16px 兜底）；
// interactive-widget 让软键盘弹出时收缩内容而非顶起布局。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-content",
  themeColor: "#f1f3fe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
