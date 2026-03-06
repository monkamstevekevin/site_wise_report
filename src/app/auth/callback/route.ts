import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', origin));
  }

  // Debug: vérifier que le cookie verifier est bien présent côté serveur
  const allCookies = request.cookies.getAll();
  const verifierCookie = allCookies.find(c => c.name.includes('code-verifier'));

  if (!verifierCookie) {
    const keys = encodeURIComponent(allCookies.map(c => c.name).join(','));
    return NextResponse.redirect(
      new URL(`/auth/login?error=no_verifier_server&keys=${keys}`, origin)
    );
  }

  // Préparer la réponse de redirection pour y attacher les cookies de session
  const response = NextResponse.redirect(new URL('/dashboard', origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options ?? {});
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=exchange_failed&msg=${encodeURIComponent(error.message)}`,
        origin
      )
    );
  }

  return response;
}
