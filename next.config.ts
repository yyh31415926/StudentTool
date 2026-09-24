import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Allow LAN testing through the stable Windows host name and current IP.
  // Hostnames are matched without scheme or port.
  allowedDevOrigins: ["yyh", "192.168.90.12"],
};

export default nextConfig;
