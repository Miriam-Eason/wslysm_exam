import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // 局域网开发按主机名显式授权，避免将开发资源向任意来源开放。
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Docker 部署需要：产出独立运行包（详见技术路线文档 Dockerfile）
  output: "standalone",
  // 固定 workspace 根目录，避免被用户主目录下游离的 package-lock.json 误判
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
