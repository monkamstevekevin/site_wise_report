'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      router.replace('/auth/login?error=no_code&msg=Aucun+code+OAuth+reçu');
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        const msg = encodeURIComponent(error.message);
        const name = encodeURIComponent(error.name ?? 'oauth_error');
        router.replace(`/auth/login?error=${name}&msg=${msg}`);
      } else {
        // Session stored in document.cookie by browser client.
        // AuthContext's onAuthStateChange also fires and redirects, but
        // we add explicit redirect as fallback.
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Connexion en cours...</p>
    </div>
  );
}
