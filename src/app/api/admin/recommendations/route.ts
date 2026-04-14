import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminRecommendations } from '@/services/recommendationService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const recommendations = await getAdminRecommendations(currentUser.organizationId);
  return NextResponse.json(recommendations);
}
