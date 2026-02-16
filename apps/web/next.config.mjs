/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
