import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur (Client Components)
 * Singleton pour éviter de recréer le client à chaque render
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  );
}
