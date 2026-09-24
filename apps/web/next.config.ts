import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@monitor/shared-kernel",
    "@monitor/db",
    "@monitor/monitoring",
    "@monitor/reporting",
    "@monitor/scheduling",
    "@monitor/notification",
    "@monitor/event-bus",
    "hono"
  ]
};

export default nextConfig;
