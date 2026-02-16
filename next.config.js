/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Babel instead of SWC when SWC binary is locked (e.g. by another process on Windows)
  swcMinify: false,
};
module.exports = nextConfig;
