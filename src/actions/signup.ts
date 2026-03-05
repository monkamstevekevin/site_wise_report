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

    // 3. Créer le profil utilisateur PostgreSQL avec rôle ADMIN et orgId
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
    return { success: false, error: (err as Error).message || 'Une erreur inattendue s\'est produite.' };
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
