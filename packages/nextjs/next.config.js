const removeImports = require("next-remove-imports")();

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  images: {
    minimumCacheTTL: 3600 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      if (!config.resolve) config.resolve = {};
      if (!config.resolve.fallback) config.resolve.fallback = {};
      config.resolve.fallback.fs = false;
    }
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");

    return config;
  },
  reactStrictMode: true,
};

module.exports = removeImports(nextConfig);
