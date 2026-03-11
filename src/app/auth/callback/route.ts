import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { getUserProfile, createUserProfile } from '@/actions/users';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const code = searchParams.get('code');

  if (error) {
    const params = new URLSearchParams({ error, msg: errorDescription ?? error });
    return NextResponse.redirect(new URL(`/auth/login?${params}`, request.url));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user) {
      const authUser = data.user;

      // Ensure DB profile exists
      let profile = await getUserProfile(authUser.id);
      if (!profile) {
        profile = await createUserProfile({
          id: authUser.id,
          email: authUser.email ?? '',
          name:
            authUser.user_metadata?.full_name ??
            authUser.user_metadata?.name ??
            authUser.email?.split('@')[0] ??
            'Utilisateur',
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        });
      }

      if (profile?.organizationId) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/auth/create-org', request.url));
      }
    }

    console.error('[callback] exchangeCodeForSession error:', exchangeError);
  }

  return NextResponse.redirect(new URL('/auth/login?error=callback_error&msg=Connexion+impossible', request.url));
}
