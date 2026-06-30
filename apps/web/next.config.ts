import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@talentos/shared-types"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
