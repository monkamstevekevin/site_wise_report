import { NextResponse, type NextRequest } from 'next/server';
import { apiLimiter, heavyLimiter } from '@/lib/ratelimit';

// Routes where heavy rate limiting applies (5 req/min per IP)
const HEAVY_ROUTES = [
  '/api/admin/org-logo',
  '/api/stripe/create-checkout',
  '/api/stripe/create-portal',
];

// Routes where standard rate limiting applies (30 req/min per IP)
const API_ROUTES = [
  '/api/time-entries',
  '/api/admin/recommendations',
  '/api/admin/users-activity',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isHeavy = HEAVY_ROUTES.some(r => pathname.startsWith(r));
  const isApi = API_ROUTES.some(r => pathname.startsWith(r));

  if (!isHeavy && !isApi) return NextResponse.next();

  const limiter = isHeavy ? heavyLimiter : apiLimiter;

  // No-op if Upstash not configured (dev/staging without Redis)
  if (!limiter) return NextResponse.next();

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.floor(reset / 1000)),
          'Retry-After': String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
