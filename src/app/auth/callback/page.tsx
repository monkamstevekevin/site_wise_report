'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Page de callback OAuth — gérée côté client pour que le browser
 * puisse accéder au PKCE verifier stocké en localStorage.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const code = new URLSearchParams(window.location.search).get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('Callback OAuth error:', error.message);
          router.push('/auth/login?error=auth_callback_failed');
        } else {
          router.push('/dashboard');
        }
      });
    } else {
      // Implicit flow — session déjà dans le hash URL, attendre onAuthStateChange
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.push(session ? '/dashboard' : '/auth/login?error=no_session');
      });
    }
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
