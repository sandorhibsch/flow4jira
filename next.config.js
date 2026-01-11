/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  
  experimental: {
    optimizePackageImports: undefined,
  }
};

module.exports = nextConfig;
