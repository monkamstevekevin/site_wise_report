'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
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

    const supabase = createSupabaseBrowserClient();
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) {
        setErrorMsg(`Erreur échange : ${error.name} — ${error.message}`);
      } else if (!data.session) {
        setErrorMsg('Échange réussi mais aucune session retournée.');
      } else {
        router.replace('/dashboard');
      }
    }).catch((e: unknown) => {
      setErrorMsg(`Exception : ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [router]);

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 max-w-sm text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive font-semibold">Erreur de connexion Google</p>
        <p className="text-sm text-muted-foreground break-all">{errorMsg}</p>
        <button
          onClick={() => router.replace('/auth/login')}
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
