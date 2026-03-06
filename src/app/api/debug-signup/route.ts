import { NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomBytes } from 'crypto';

// ROUTE TEMPORAIRE — à supprimer après diagnostic
export async function GET() {
  const results: Record<string, string> = {};

  // 1. Test connexion DB
  try {
    await db.select().from(organizations).limit(1);
    results.db_connection = 'OK';
  } catch (e) {
    const err = e as any;
    results.db_connection = 'FAIL: ' + err.message;
    results.db_cause = err.cause?.message ?? err.cause ?? 'none';
    results.db_code = err.code ?? err.cause?.code ?? 'none';
    results.db_detail = JSON.stringify(err.cause ?? {});
    return NextResponse.json(results);
  }

  // 2. Test insert organization
  let orgId: string | null = null;
  try {
    const [org] = await db.insert(organizations).values({
      name: 'DebugTest',
      slug: 'debugtest-' + randomBytes(3).toString('hex'),
      plan: 'TRIAL',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      inviteToken: randomBytes(24).toString('hex'),
    }).returning();
    orgId = org.id;
    results.org_insert = 'OK: ' + orgId;
  } catch (e) {
    results.org_insert = 'FAIL: ' + (e as Error).message;
    return NextResponse.json(results);
  }

  // 3. Test insert user
  const testUserId = randomBytes(16).toString('hex');
  try {
    await db.insert(users).values({
      id: testUserId,
      email: 'debug-' + randomBytes(4).toString('hex') + '@test.com',
      name: 'Debug User',
      role: 'ADMIN',
      avatarUrl: null,
      organizationId: orgId,
    });
    results.user_insert = 'OK';
  } catch (e) {
    results.user_insert = 'FAIL: ' + (e as Error).message;
  }

  // 4. Test Supabase Admin
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) results.supabase_admin = 'FAIL: ' + error.message;
    else results.supabase_admin = 'OK, users count: ' + data.users.length;
  } catch (e) {
    results.supabase_admin = 'FAIL: ' + (e as Error).message;
  }

  // Cleanup
  try {
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(organizations).where(eq(organizations.id, orgId!));
  } catch {}

  return NextResponse.json(results);
}
