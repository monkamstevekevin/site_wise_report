import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', origin));
  }

  // Vérifier le cookie verifier côté serveur
  const allCookies = request.cookies.getAll();
  const verifierCookie = allCookies.find(c => c.name.includes('code-verifier'));

  if (!verifierCookie) {
    const keys = encodeURIComponent(allCookies.map(c => c.name).join(','));
    return NextResponse.redirect(
      new URL(`/auth/login?error=no_verifier&keys=${keys}`, origin)
    );
  }

  // Préparer la réponse AVANT le client (pour capturer les cookies de session)
  const response = NextResponse.redirect(new URL('/dashboard', origin));

  try {
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
              // Écrire sur la réponse de redirection
              response.cookies.set(name, value, {
                path: options?.path ?? '/',
                sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
                maxAge: options?.maxAge,
                httpOnly: options?.httpOnly ?? false,
                secure: options?.secure ?? false,
              });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // TEST : rediriger vers debug pour voir l'erreur exacte
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=exchange_failed&msg=${encodeURIComponent(error.message)}&code=${encodeURIComponent(error.code ?? 'none')}`,
          origin
        )
      );
    }

    // TEST : confirmer que l'échange a réussi et combien de cookies ont été définis
    const sessionCookieCount = response.cookies.getAll().length;
    if (sessionCookieCount === 0) {
      // L'échange a réussi mais aucun cookie de session n'a été défini !
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=no_session_cookies&user=${encodeURIComponent(data.user?.email ?? 'unknown')}`,
          origin
        )
      );
    }

    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      new URL(`/auth/login?error=exception&msg=${encodeURIComponent(msg)}`, origin)
    );
  }
}
