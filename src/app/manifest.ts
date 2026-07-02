import type { MetadataRoute } from "next";

// PWA 清单：以学生端为主入口，可安装到主屏、全屏 standalone 运行。
// Next 会在 /manifest.webmanifest 提供此文件。
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "无锡旅商智能练测系统",
    short_name: "旅商练测",
    description: "无锡旅游商贸高等职业技术学校 · 智能题库练测平台",
    start_url: "/student",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f3fe",
    theme_color: "#f1f3fe",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
