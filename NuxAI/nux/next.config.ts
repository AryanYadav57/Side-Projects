import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.10", "192.168.0.9", "0.0.0.0", "localhost"],
};

export default nextConfig;
