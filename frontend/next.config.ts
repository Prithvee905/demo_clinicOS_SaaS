import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow images from any domain (for future use)
  images: {
    domains: ["clinicossaas-production.up.railway.app"],
  },
};

export default nextConfig;
