'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Page de callback OAuth (implicit flow).
 * Supabase met les tokens dans le hash de l'URL (#access_token=...).
 * Le client browser les détecte automatiquement via onAuthStateChange.
 */
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        router.push('/dashboard');
      }
    });

    // Timeout de sécurité : si rien ne se passe en 5s, retour login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.push('/auth/login?error=timeout');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
