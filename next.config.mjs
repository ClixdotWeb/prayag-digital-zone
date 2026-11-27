/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Self-contained server bundle for the Docker image (Coolify deploy).
  output: 'standalone',
};
export default nextConfig;
