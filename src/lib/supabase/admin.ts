import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase Admin (service_role) — UNIQUEMENT côté serveur.
 * Permet de créer/supprimer des utilisateurs Supabase Auth sans passer par la session.
 * Ne jamais exposer ce client côté client.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
