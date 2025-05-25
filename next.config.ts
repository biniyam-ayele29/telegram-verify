import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        port: "",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
  // Allow requests from ngrok domains during development
  experimental: {
    allowedDevOrigins: [
      "https://a792-196-189-152-125.ngrok-free.app",
      "https://*.ngrok-free.app",
    ],
  },
};

export default nextConfig;
