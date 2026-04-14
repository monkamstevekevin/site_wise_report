import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, projects, reports } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTimeEntry, getTimeEntriesByProject } from '@/services/timeEntryService';

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await request.json();

  // Validate required fields
  if (!body.projectId || !isValidUUID(body.projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }
  const duration = Number(body.durationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json({ error: 'durationMinutes must be a positive number' }, { status: 400 });
  }
  const date = new Date(body.date);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  // IDOR: verify project belongs to user's org
  const [project] = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, body.projectId), eq(projects.organizationId, dbUser.organizationId)));
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // IDOR: verify reportId belongs to the project if provided
  if (body.reportId) {
    if (!isValidUUID(body.reportId)) return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
    const [report] = await db.select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.id, body.reportId), eq(reports.projectId, body.projectId)));
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const entry = await createTimeEntry({
    userId: user.id,
    projectId: body.projectId,
    reportId: body.reportId,
    date,
    durationMinutes: duration,
    notes: typeof body.notes === 'string' ? body.notes : undefined,
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
  if (!projectId || !isValidUUID(projectId)) {
    return NextResponse.json({ error: 'Valid projectId required' }, { status: 400 });
  }

  const entries = await getTimeEntriesByProject(projectId, dbUser.organizationId);
  return NextResponse.json(entries);
}
