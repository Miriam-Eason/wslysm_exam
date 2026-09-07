import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "无锡旅游商贸助考宝",
  description: "无锡旅游商贸高等职业技术学校 · 智能题库练测平台",
  applicationName: "助考宝",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "助考宝",
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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
