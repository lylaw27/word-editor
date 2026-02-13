/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        'path-browserify': require.resolve('path-browserify'),
      };
    }
    return config;
  },
  transpilePackages: ['@tiptap/react', '@tiptap/core', '@tiptap/pm'],
};

module.exports = nextConfig;
