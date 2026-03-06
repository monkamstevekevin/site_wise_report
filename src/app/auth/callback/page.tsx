'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Page de callback OAuth.
 * Gère les deux cas :
 * - Implicit flow : tokens dans le hash (#access_token=...)
 * - PKCE flow    : code dans les query params (?code=...)
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function handleCallback() {
      // Cas 1 : implicit flow — tokens dans le hash
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          router.push('/dashboard');
          return;
        }
        router.push('/auth/login?error=session_failed');
        return;
      }

      // Cas 2 : PKCE flow — code dans les query params
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.push('/dashboard');
          return;
        }
        router.push('/auth/login?error=code_exchange_failed');
        return;
      }

      // Aucun token trouvé
      router.push('/auth/login?error=no_tokens');
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
