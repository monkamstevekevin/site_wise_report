import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=no_code', origin));
  }

  const cookieStore = await cookies();

  // Debug : vérifier que le verifier est présent côté serveur
  const allCookieNames = cookieStore.getAll().map(c => c.name);
  const hasVerifier = allCookieNames.some(n => n.includes('code-verifier'));

  if (!hasVerifier) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=no_verifier_server&keys=${encodeURIComponent(allCookieNames.join(','))}`,
        origin
      )
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
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

  return NextResponse.redirect(new URL('/dashboard', origin));
}
