
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Added for optimized Docker builds
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
    allowedDevOrigins: ["https://*.ngrok-free.app", "https://*.ngrok.io"],
  },
  // Add headers for security and font loading
  async headers() {
    const baseHeaders = [
      {
        key: "Access-Control-Allow-Origin",
        value: "*", // Be more restrictive in production if possible
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY", // Use DENY to prevent clickjacking, or SAMEORIGIN if you need to frame your own content
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()", // Deny common sensitive permissions by default
      },
    ];

    // Strict-Transport-Security should ideally only be sent over HTTPS
    // In a real production setup, you'd ensure your environment correctly identifies HTTPS
    // For simplicity here, it's added generally. Consider its implications.
    if (process.env.NODE_ENV === 'production') {
        baseHeaders.push({
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // 2 years
        });
    }


    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
    ];
  },
};

export default nextConfig;
