'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createUserProfile, getUserProfile } from '@/actions/users';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const hasRun = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const supabase = createSupabaseBrowserClient();

    // @supabase/ssr automatically detects ?code= in the URL, exchanges it,
    // and fires onAuthStateChange(SIGNED_IN). We just wait for that event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();

          const authUser = session.user;

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

          // Hard navigation — fresh page load with session in cookies
          if (profile?.organizationId) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/auth/create-org';
          }
        }

        if (event === 'SIGNED_OUT') {
          subscription.unsubscribe();
          localStorage.setItem('__oauth_error', 'Connexion annulée ou expirée.');
          window.location.href = '/auth/login';
        }
      }
    );

    // Fallback: if no event after 15s, show error
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setErrorMsg('Délai dépassé — aucune session reçue. Réessayez.');
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 max-w-sm text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-semibold">Erreur de connexion Google</p>
        <p className="text-sm text-muted-foreground break-all">{errorMsg}</p>
        <button
          onClick={() => { window.location.href = '/auth/login'; }}
          className="text-sm text-primary underline"
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Connexion en cours...</p>
    </div>
  );
}
