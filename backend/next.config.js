const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash-es'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.js$/,
      include: /polyfills/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
