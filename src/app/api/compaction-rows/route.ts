import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, reports, compactionTestRows } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await request.json();
  const { reportId, rows } = body;

  if (!reportId || !isUUID(reportId)) {
    return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 });
  }
  if (rows.length > 100) {
    return NextResponse.json({ error: 'Too many rows (max 100)' }, { status: 400 });
  }

  // IDOR: verify report belongs to user's org
  const [report] = await db
    .select({ id: reports.id, projectId: reports.projectId })
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.organizationId, dbUser.organizationId)));
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const toInsert = rows.map((r: Record<string, unknown>, i: number) => ({
    reportId,
    projectId: report.projectId,
    organizationId: dbUser.organizationId!,
    rowOrder: String(i),
    localisation: typeof r.localisation === 'string' ? r.localisation : null,
    testDate: typeof r.testDate === 'string' ? r.testDate : null,
    waterContent: r.waterContent != null ? String(r.waterContent) : null,
    dryDensity: r.dryDensity != null ? String(r.dryDensity) : null,
    retained5mm: r.retained5mm != null ? String(r.retained5mm) : null,
    correctedDensity: r.correctedDensity != null ? String(r.correctedDensity) : null,
    compactionPercent: r.compactionPercent != null ? String(r.compactionPercent) : null,
    materialRef: typeof r.materialRef === 'string' ? r.materialRef : null,
    requiredPercent: r.requiredPercent != null ? String(r.requiredPercent) : null,
    isCompliant: typeof r.isCompliant === 'boolean' ? r.isCompliant : null,
    sampleTaken: typeof r.sampleTaken === 'boolean' ? r.sampleTaken : null,
    sampleNo: typeof r.sampleNo === 'string' ? r.sampleNo : null,
    remarks: typeof r.remarks === 'string' ? r.remarks : null,
  }));

  const inserted = await db.insert(compactionTestRows).values(toInsert).returning();
  return NextResponse.json(inserted, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('reportId');
  const projectId = searchParams.get('projectId');

  if (reportId) {
    if (!isUUID(reportId)) return NextResponse.json({ error: 'Invalid reportId' }, { status: 400 });
    // IDOR: verify report belongs to org
    const [report] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.organizationId, dbUser.organizationId)));
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rows = await db
      .select()
      .from(compactionTestRows)
      .where(eq(compactionTestRows.reportId, reportId))
      .orderBy(asc(compactionTestRows.rowOrder));
    return NextResponse.json(rows);
  }

  if (projectId) {
    if (!isUUID(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
    const rows = await db
      .select()
      .from(compactionTestRows)
      .where(and(
        eq(compactionTestRows.projectId, projectId),
        eq(compactionTestRows.organizationId, dbUser.organizationId)
      ))
      .orderBy(asc(compactionTestRows.rowOrder));
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: 'Provide reportId or projectId' }, { status: 400 });
}
