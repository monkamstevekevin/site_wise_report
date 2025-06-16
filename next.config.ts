
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Note: For production builds (`next start` or deployments),
  // a successful `next build` must complete first. This generates
  // necessary manifest files in the .next directory.
  // Errors like ENOENT for build-manifest.json typically mean
  // the build artifacts are missing or incomplete from a failed build.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
