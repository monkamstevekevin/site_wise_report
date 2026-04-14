import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, reports } from '@/db/schema';
import { eq, and, max } from 'drizzle-orm';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = currentUser.organizationId;

  const activity = await db
    .select({
      userId: reports.technicianId,
      lastReportAt: max(reports.createdAt),
    })
    .from(reports)
    .where(eq(reports.organizationId, orgId))
    .groupBy(reports.technicianId);

  return NextResponse.json(activity);
}
