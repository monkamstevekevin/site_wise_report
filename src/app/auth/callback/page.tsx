'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) { router.push('/auth/login?error=no_code'); return; }

    // Lire le verifier directement depuis document.cookie
    const allCookies = Object.fromEntries(
      document.cookie.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    // Chercher le cookie verifier (nom exact)
    const verifierKey = Object.keys(allCookies).find(k => k.includes('code-verifier'));
    const rawVerifier = verifierKey ? allCookies[verifierKey] : null;

    if (!rawVerifier) {
      router.push('/auth/login?error=no_verifier&keys=' + encodeURIComponent(Object.keys(allCookies).join(',')));
      return;
    }

    // Décoder le verifier (base64url → string)
    let verifier: string;
    try {
      verifier = atob(rawVerifier.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      // Peut-être pas encodé en base64 — essayer raw
      verifier = rawVerifier;
    }

    // Échanger le code directement via l'API Supabase sans passer par le client SSR
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          // Stocker la session dans les cookies manuellement puis aller au dashboard
          document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=3600; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.refresh_token}; path=/; max-age=604800; SameSite=Lax`;

          // Utiliser le client Supabase pour setter la session proprement
          import('@/lib/supabase/client').then(({ createSupabaseBrowserClient }) => {
            const supabase = createSupabaseBrowserClient();
            supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            }).then(() => router.push('/dashboard'));
          });
        } else {
          router.push('/auth/login?error=api_failed&msg=' + encodeURIComponent(JSON.stringify(data)));
        }
      })
      .catch(e => router.push('/auth/login?error=fetch_failed&msg=' + encodeURIComponent(e.message)));
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
