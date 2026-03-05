'use server';

import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = randomBytes(3).toString('hex'); // 6 chars
  return `${base}-${suffix}`;
}

function generateInviteToken(): string {
  return randomBytes(24).toString('hex'); // 48 chars, URL-safe
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createOrganization(name: string) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const [org] = await db
    .insert(organizations)
    .values({
      name,
      slug: generateSlug(name),
      plan: 'TRIAL',
      subscriptionStatus: 'TRIALING',
      trialEndsAt,
      inviteToken: generateInviteToken(),
    })
    .returning();

  return org;
}

export async function getOrganizationById(id: string) {
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrganizationByInviteToken(token: string) {
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.inviteToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOrganizationByStripeSubscriptionId(subId: string) {
  const rows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.stripeSubscriptionId, subId))
    .limit(1);
  return rows[0] ?? null;
}

export async function regenerateInviteToken(orgId: string) {
  const [updated] = await db
    .update(organizations)
    .set({ inviteToken: generateInviteToken(), updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return updated;
}

export async function updateOrgSubscription(
  orgId: string,
  data: {
    plan?: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    subscriptionStatus?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }
) {
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return updated;
}
