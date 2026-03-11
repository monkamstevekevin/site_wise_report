'use server';

import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createOrganization } from '@/services/organizationService';

const PLAN_USER_LIMITS: Record<string, number | null> = {
  TRIAL: null, STARTER: 5, PRO: null, ENTERPRISE: null,
};

/**
 * Crée une organisation + un utilisateur ADMIN en une seule opération atomique.
 * Utilise l'API Admin Supabase pour éviter les race conditions avec onAuthStateChange.
 */
export async function createOrgAndSignUp(params: {
  email: string;
  password: string;
  name: string;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Créer l'utilisateur dans Supabase Auth via Admin API
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      user_metadata: { full_name: params.name },
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        return { success: false, error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' };
      }
      return { success: false, error: authError.message };
    }

    const uid = data.user.id;

    // 2. Créer l'organisation
    const org = await createOrganization(params.companyName);

    // 3. Créer le profil utilisateur PostgreSQL avec rôle ADMIN et orgId.
    // Supprimer d'abord toute ligne stale avec le même email (id différent issu
    // d'une tentative précédente avortée) pour éviter la violation de contrainte unique.
    await db.delete(users).where(eq(users.email, params.email));
    await db.insert(users).values({
      id: uid,
      email: params.email,
      name: params.name,
      role: 'ADMIN',
      avatarUrl: null,
      organizationId: org.id,
    });

    return { success: true };
  } catch (err) {
    console.error('[createOrgAndSignUp]', err);
    const message =
      (err as any)?.cause?.message ??
      (err as Error).message ??
      'Une erreur inattendue s\'est produite.';
    return { success: false, error: message };
  }
}

/**
 * Crée une organisation pour un utilisateur Google OAuth (sans org existante).
 * Appelé depuis /auth/create-org après le premier sign-in Google.
 */
export async function setupGoogleUserOrg(params: {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await createOrganization(params.companyName);

    // Try UPDATE first (user profile already exists — handles both the
    // normal case and re-attempts after a failed previous try).
    const updated = await db
      .update(users)
      .set({ organizationId: org.id, role: 'ADMIN', updatedAt: new Date() })
      .where(eq(users.id, params.userId))
      .returning({ id: users.id });

    if (updated.length === 0) {
      // No row by this auth ID. A stale row with the same email (different auth ID)
      // can exist after test runs or if the Supabase auth user was recreated.
      // Delete it first — FK RESTRICT on reports/chat will raise an error if real
      // production data is attached, protecting users who already have data.
      await db.delete(users).where(eq(users.email, params.email));

      // Insert fresh row linked to the current auth user.
      await db.insert(users).values({
        id: params.userId,
        email: params.email,
        name: params.name,
        role: 'ADMIN',
        avatarUrl: params.avatarUrl ?? null,
        organizationId: org.id,
      });
    }

    return { success: true };
  } catch (err) {
    console.error('[setupGoogleUserOrg]', err);
    // Extract the real Postgres error (Drizzle wraps it in err.cause)
    const message =
      (err as any)?.cause?.message ??
      (err as Error).message ??
      'Erreur lors de la création de l\'organisation.';
    return { success: false, error: message };
  }
}

/**
 * Crée un utilisateur TECHNICIAN via lien d'invitation.
 */
export async function createUserViaInvite(params: {
  email: string;
  password: string;
  name: string;
  orgId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier la limite d'utilisateurs
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, params.orgId)).limit(1);
    const org = orgRows[0];
    if (org) {
      const limit = PLAN_USER_LIMITS[org.plan];
      if (limit !== null) {
        const [{ value: currentCount }] = await db
          .select({ value: count() })
          .from(users)
          .where(eq(users.organizationId, params.orgId));
        if (Number(currentCount) >= limit) {
          return { success: false, error: `Limite atteinte : le plan ${org.plan} autorise ${limit} utilisateurs maximum.` };
        }
      }
    }

    // 1. Créer dans Supabase Auth
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      user_metadata: { full_name: params.name },
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        return { success: false, error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' };
      }
      return { success: false, error: authError.message };
    }

    const uid = data.user.id;

    // 2. Créer le profil utilisateur PostgreSQL
    // Supprimer d'abord toute ligne stale avec le même email (id différent)
    await db.delete(users).where(eq(users.email, params.email));
    await db.insert(users).values({
      id: uid,
      email: params.email,
      name: params.name,
      role: 'TECHNICIAN',
      avatarUrl: null,
      organizationId: params.orgId,
    });

    return { success: true };
  } catch (err) {
    console.error('[createUserViaInvite]', err);
    return { success: false, error: (err as Error).message || 'Une erreur inattendue s\'est produite.' };
  }
}
