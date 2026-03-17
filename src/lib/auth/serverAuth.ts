'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

type AllowedRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';

/**
 * Vérifie côté serveur que l'utilisateur authentifié possède un des rôles autorisés.
 * Lance une erreur si non authentifié ou rôle insuffisant.
 */
export async function requireRole(
  allowedRoles: AllowedRole[]
): Promise<{ userId: string; role: AllowedRole; organizationId: string | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    throw new Error('Non authentifié. Veuillez vous connecter.');
  }

  const rows = await db
    .select({ id: users.id, role: users.role, organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (rows.length === 0) {
    throw new Error('Profil utilisateur introuvable.');
  }

  const userRow = rows[0];

  if (!allowedRoles.includes(userRow.role as AllowedRole)) {
    throw new Error(
      `Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}. Votre rôle actuel : ${userRow.role}.`
    );
  }

  return {
    userId: userRow.id,
    role: userRow.role as AllowedRole,
    organizationId: userRow.organizationId,
  };
}
