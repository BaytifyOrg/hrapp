import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "hr.baytify.com"],
    },
  },
};

export default nextConfig;
