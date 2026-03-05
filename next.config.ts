
import type {NextConfig} from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "connect-src 'self' *.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://placehold.co *.supabase.co",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
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
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs
  silent: !process.env.CI,
  // Upload source maps only in CI/CD, not local builds
  widenClientFileUpload: true,
  // Disable Sentry telemetry
  telemetry: false,
  // Tree-shake Sentry debug code in production
  disableLogger: true,
});
