import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Route de callback OAuth — Supabase redirige ici après la connexion Google.
 * Échange le code d'autorisation contre une session, puis redirige vers le dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Erreur échange code OAuth:', error.message);
  }

  // En cas d'erreur, rediriger vers login avec message
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
