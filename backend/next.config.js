const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'lodash-es'],
    turbo: {
      rules: {
        'polyfills/*.js': {
          loaders: ['raw-loader'],
          as: '*.js'
        }
      }
    }
  }
};

module.exports = nextConfig;
