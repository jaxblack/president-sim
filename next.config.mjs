/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/president-sim',
  assetPrefix: '/president-sim/',
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,
};
export default nextConfig;
