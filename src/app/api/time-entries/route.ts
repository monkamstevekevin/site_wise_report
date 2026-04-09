import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createTimeEntry, getTimeEntriesByProject } from '@/services/timeEntryService';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await request.json();
  const entry = await createTimeEntry({
    userId: user.id,
    projectId: body.projectId,
    reportId: body.reportId,
    date: new Date(body.date),
    durationMinutes: body.durationMinutes,
    notes: body.notes,
    organizationId: dbUser.organizationId,
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const entries = await getTimeEntriesByProject(projectId, dbUser.organizationId);
  return NextResponse.json(entries);
}
