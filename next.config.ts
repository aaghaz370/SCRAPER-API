import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Include yt-dlp Linux binary in the serverless function bundle
  outputFileTracingIncludes: {
    "/api/youtube/video": ["./bin/yt-dlp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
