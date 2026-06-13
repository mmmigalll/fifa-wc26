/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enables src/instrumentation.ts (in-app 15-min sync scheduler).
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'crests.football-data.org' }],
  },
};
export default nextConfig;
