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

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      setErrorMsg('Aucun code OAuth reçu dans l\'URL.');
      return;
    }

    const run = async () => {
      const supabase = createSupabaseBrowserClient();

      // 1. Exchange the OAuth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const msg = `Erreur échange : ${error.name} — ${error.message}`;
        localStorage.setItem('__oauth_error', msg);
        setErrorMsg(msg);
        return;
      }
      if (!data.session) {
        const msg = 'Échange réussi mais aucune session retournée.';
        localStorage.setItem('__oauth_error', msg);
        setErrorMsg(msg);
        return;
      }

      // 2. Ensure a DB profile exists (idempotent — onConflictDoNothing)
      const authUser = data.session.user;
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

      // 3. Hard navigation so AuthContext re-initialises with fresh cookies
      if (profile?.organizationId) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/auth/create-org';
      }
    };

    run().catch((e: unknown) => {
      setErrorMsg(`Exception : ${e instanceof Error ? e.message : String(e)}`);
    });
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
