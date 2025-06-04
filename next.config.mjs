/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: "standalone",
  // Suppress useLayoutEffect warnings in development
  onDemandEntries: {
    // Keeps the dev server alive between page loads
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/v1/create-qr-code/**",
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suppress useLayoutEffect warnings in development
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-dom$": "react-dom/profiling",
      };
    }

    // Handle Node.js module warnings
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;
