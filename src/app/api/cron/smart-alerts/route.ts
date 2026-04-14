import { NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, reports, users, userAssignments, notifications } from '@/db/schema';
import { eq, and, lt, lte, gte, ne, count, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type CronNotificationType = 'project_overdue' | 'technician_inactive' | 'report_pending_too_long';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const alerts: string[] = [];

  // Helper: get admin users for an org
  async function getAdmins(orgId: string) {
    return db.select({ id: users.id }).from(users).where(
      and(eq(users.organizationId, orgId), eq(users.role, 'ADMIN'))
    );
  }

  // Helper: send notification to all admins of an org (skip duplicates silently)
  async function notifyAdmins(orgId: string, type: CronNotificationType, message: string, targetId: string, link: string) {
    const admins = await getAdmins(orgId);
    for (const admin of admins) {
      try {
        await db.insert(notifications).values({
          userId: admin.id,
          type,
          message,
          targetId,
          link,
          organizationId: orgId,
        });
      } catch {
        // ignore duplicate key errors
      }
    }
  }

  // 1. Projets en retard (passé endDate, pas COMPLETED)
  const overdueProjects = await db
    .select({ id: projects.id, name: projects.name, organizationId: projects.organizationId })
    .from(projects)
    .where(and(
      ne(projects.status, 'COMPLETED'),
      lt(projects.endDate, now)
    ));

  for (const project of overdueProjects) {
    if (!project.organizationId) continue;
    await notifyAdmins(
      project.organizationId,
      'project_overdue',
      `Le projet "${project.name}" a dépassé sa date de fin sans être complété.`,
      project.id,
      `/project/${project.id}`
    );
    alerts.push(`project_overdue: ${project.name}`);
  }

  // 2. Rapports en attente depuis plus de 48h
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const pendingReports = await db
    .select({ id: reports.id, projectId: reports.projectId, organizationId: reports.organizationId })
    .from(reports)
    .where(and(eq(reports.status, 'SUBMITTED'), lte(reports.createdAt, cutoff48h)));

  for (const report of pendingReports) {
    if (!report.organizationId) continue;
    await notifyAdmins(
      report.organizationId,
      'report_pending_too_long',
      `Un rapport soumis il y a plus de 48h n'a pas encore été révisé.`,
      report.id,
      `/reports/view/${report.id}`
    );
    alerts.push(`report_pending_too_long: ${report.id}`);
  }

  // 3. Techniciens inactifs (aucun rapport depuis 7 jours sur projet actif)
  const cutoff7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeAssignments = await db
    .select({
      userId: userAssignments.userId,
      projectId: userAssignments.projectId,
      organizationId: userAssignments.organizationId,
    })
    .from(userAssignments)
    .innerJoin(projects, and(
      eq(userAssignments.projectId, projects.id),
      eq(projects.status, 'ACTIVE')
    ));

  if (activeAssignments.length > 0) {
    const activeProjectIds = [...new Set(activeAssignments.map(a => a.projectId))];

    // Batch: get all (technicianId, projectId) pairs with recent reports
    const recentActivity = await db
      .select({ technicianId: reports.technicianId, projectId: reports.projectId })
      .from(reports)
      .where(and(
        inArray(reports.projectId, activeProjectIds),
        gte(reports.createdAt, cutoff7days)
      ));
    const recentSet = new Set(recentActivity.map(r => `${r.technicianId}:${r.projectId}`));

    // Batch: get user names
    const userIds = [...new Set(activeAssignments.map(a => a.userId))];
    const techUsers = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
    const nameById = new Map(techUsers.map(u => [u.id, u.name]));

    for (const assignment of activeAssignments) {
      if (!assignment.organizationId) continue;
      if (recentSet.has(`${assignment.userId}:${assignment.projectId}`)) continue;

      const techName = nameById.get(assignment.userId) ?? 'Un technicien';
      await notifyAdmins(
        assignment.organizationId,
        'technician_inactive',
        `${techName} n'a soumis aucun rapport depuis 7 jours sur un projet actif.`,
        assignment.userId,
        `/admin/technicians`
      );
      alerts.push(`technician_inactive: ${techName}`);
    }
  }

  return NextResponse.json({ ok: true, alerts, count: alerts.length });
}
