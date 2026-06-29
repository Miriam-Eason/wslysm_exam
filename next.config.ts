import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Docker 部署需要：产出独立运行包（详见技术路线文档 Dockerfile）
  output: "standalone",
  // 固定 workspace 根目录，避免被用户主目录下游离的 package-lock.json 误判
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
