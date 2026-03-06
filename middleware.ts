import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware de protection des routes.
 * - Routes non authentifiées → redirige vers /auth/login
 * - Utilisateur connecté sur /auth/* → redirige vers /dashboard
 * Rafraîchit aussi automatiquement les tokens de session expirés.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Récupère l'utilisateur (rafraîchit le token si besoin)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/auth');
  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute = pathname === '/'
    || pathname.startsWith('/auth/callback')
    || pathname.startsWith('/auth/join');

  // Non connecté → redirige vers login (sauf routes publiques et API)
  if (!user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Connecté sur une page auth → redirige vers dashboard
  if (user && isAuthRoute && !pathname.startsWith('/auth/callback') && !pathname.startsWith('/auth/reset-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclure les assets statiques et les routes Next.js internes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
