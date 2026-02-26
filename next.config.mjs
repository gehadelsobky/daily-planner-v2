/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid persistent cache corruption that can cause missing dev chunks/CSS.
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;
