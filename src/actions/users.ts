'use server';

import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@/lib/types';

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationPlan: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE' | null;
  organizationStatus: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | null;
  trialEndsAt: string | null;
};

/**
 * Récupère le profil utilisateur depuis PostgreSQL avec LEFT JOIN organizations.
 */
export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
      organizationId: users.organizationId,
      orgName: organizations.name,
      orgPlan: organizations.plan,
      orgStatus: organizations.subscriptionStatus,
      orgTrialEndsAt: organizations.trialEndsAt,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) return null;

  const u = rows[0];
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    avatarUrl: u.avatarUrl,
    organizationId: u.organizationId ?? null,
    organizationName: u.orgName ?? null,
    organizationPlan: (u.orgPlan as AppUser['organizationPlan']) ?? null,
    organizationStatus: (u.orgStatus as AppUser['organizationStatus']) ?? null,
    trialEndsAt: u.orgTrialEndsAt ? u.orgTrialEndsAt.toISOString() : null,
  };
}

/**
 * Crée un nouvel utilisateur dans PostgreSQL lors du premier sign-in.
 */
export async function createUserProfile(data: {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  avatarUrl?: string | null;
  organizationId?: string | null;
}): Promise<AppUser> {
  const [created] = await db
    .insert(users)
    .values({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role ?? 'TECHNICIAN',
      avatarUrl: data.avatarUrl ?? null,
      organizationId: data.organizationId ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    const existing = await getUserProfile(data.id);
    return existing!;
  }

  return getUserProfile(created.id) as Promise<AppUser>;
}

/**
 * Met à jour le profil utilisateur (nom, avatar).
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string | null }
): Promise<AppUser> {
  await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return getUserProfile(userId) as Promise<AppUser>;
}
