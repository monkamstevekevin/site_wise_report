'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
      router.push('/auth/login?error=no_code');
      return;
    }

    // DEBUG: lister les noms des cookies disponibles
    const cookieNames = document.cookie
      .split(';')
      .map(c => c.trim().split('=')[0])
      .join(',');

    const hasVerifier = document.cookie.includes('code-verifier');

    if (!hasVerifier) {
      // Le cookie verifier n'existe pas — redirect avec les noms de cookies présents
      router.push(
        '/auth/login?error=no_verifier_cookie&cookies=' +
        encodeURIComponent(cookieNames || 'EMPTY')
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error || !data.session) {
        router.push('/auth/login?error=exchange_failed&msg=' + encodeURIComponent(error?.message ?? 'no session'));
      } else {
        router.push('/dashboard');
      }
    });
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
