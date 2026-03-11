'use server';

import { sendEmail } from '@/lib/email/client';
import {
  emailReportSubmitted,
  emailReportValidated,
  emailReportRejected,
} from '@/lib/email/templates';
import { db } from '@/db';
import { users, reports } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { addNotification } from '@/services/notificationService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAdminSupervisors(orgId?: string): Promise<{ id: string; email: string; name: string }[]> {
  const conditions = orgId
    ? and(inArray(users.role, ['ADMIN', 'SUPERVISOR']), eq(users.organizationId, orgId))
    : inArray(users.role, ['ADMIN', 'SUPERVISOR']);

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(conditions);
  return rows;
}

async function getUserById(userId: string): Promise<{ id: string; email: string; name: string } | null> {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function getReportById(reportId: string) {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);
  return rows[0] ?? null;
}

async function send(to: string[], subject: string, html: string) {
  if (to.length === 0) return;
  for (const email of to) {
    const { error } = await sendEmail({ to: email, subject, html });
    if (error) console.error(`[email] Erreur envoi à ${email}:`, error);
    else console.log(`[email] Envoyé: "${subject}" → ${email}`);
  }
}

// ─── Actions publiques ────────────────────────────────────────────────────────

export async function notifyReportSubmitted(reportId: string, orgId?: string) {
  try {
    const [report, admins] = await Promise.all([
      getReportById(reportId),
      getAdminSupervisors(orgId),
    ]);
    if (!report || admins.length === 0) return;

    const technician = await getUserById(report.technicianId);
    const techName = technician?.name ?? 'Technicien';
    const anomalyTag = report.aiIsAnomalous ? ' ⚠️ Anomalie détectée' : '';

    const { subject, html } = emailReportSubmitted({
      reportId,
      technicianName: techName,
      projectId: report.projectId,
      materialType: report.materialType,
      batchNumber: report.batchNumber,
      supplier: report.supplier,
      isAnomalous: report.aiIsAnomalous ?? undefined,
      anomalyExplanation: report.aiAnomalyExplanation ?? undefined,
    });

    await send(admins.map(r => r.email), subject, html);

    await Promise.all(admins.map(admin =>
      addNotification(admin.id, {
        type: 'report_update',
        message: `Nouveau rapport soumis par ${techName} — Lot ${report.batchNumber}${anomalyTag}`,
        targetId: reportId,
        link: `/reports/view/${reportId}`,
      }).catch(() => {})
    ));
  } catch (err) {
    console.error('[notifyReportSubmitted]', err);
  }
}

export async function notifyReportValidated(reportId: string) {
  try {
    const report = await getReportById(reportId);
    if (!report) return;

    const technician = await getUserById(report.technicianId);
    if (!technician) return;

    const { subject, html } = emailReportValidated({
      reportId,
      technicianName: technician.name,
      materialType: report.materialType,
      batchNumber: report.batchNumber,
    });

    await send([technician.email], subject, html);

    await addNotification(technician.id, {
      type: 'report_update',
      message: `✅ Votre rapport (Lot ${report.batchNumber}) a été validé.`,
      targetId: reportId,
      link: `/reports/view/${reportId}`,
    }).catch(() => {});
  } catch (err) {
    console.error('[notifyReportValidated]', err);
  }
}

export async function notifyReportRejected(reportId: string, rejectionReason: string, orgId?: string) {
  try {
    const report = await getReportById(reportId);
    if (!report) return;

    const technician = await getUserById(report.technicianId);
    if (!technician) return;

    const { subject, html } = emailReportRejected({
      reportId,
      technicianName: technician.name,
      materialType: report.materialType,
      batchNumber: report.batchNumber,
      rejectionReason,
    });

    await send([technician.email], subject, html);

    await addNotification(technician.id, {
      type: 'report_update',
      message: `❌ Votre rapport (Lot ${report.batchNumber}) a été rejeté. Raison : ${rejectionReason.substring(0, 80)}${rejectionReason.length > 80 ? '…' : ''}`,
      targetId: reportId,
      link: `/reports/view/${reportId}`,
    }).catch(() => {});

    await checkAndAlertProjectConformity(report.projectId, orgId).catch(() => {});
  } catch (err) {
    console.error('[notifyReportRejected]', err);
  }
}

// ─── Alerte conformité projet ─────────────────────────────────────────────────

const REJECTION_ALERT_THRESHOLD = 0.30;
const MIN_DECIDED_REPORTS       = 3;

async function checkAndAlertProjectConformity(projectId: string, orgId?: string) {
  const decided = await db
    .select({ status: reports.status })
    .from(reports)
    .where(
      and(
        eq(reports.projectId, projectId),
        inArray(reports.status, ['VALIDATED', 'REJECTED'])
      )
    );

  if (decided.length < MIN_DECIDED_REPORTS) return;

  const rejectedCount  = decided.filter(r => r.status === 'REJECTED').length;
  const rejectionRate  = rejectedCount / decided.length;

  if (rejectionRate < REJECTION_ALERT_THRESHOLD) return;

  const admins = await getAdminSupervisors(orgId);
  const pct    = Math.round(rejectionRate * 100);

  await Promise.all(admins.map(admin =>
    addNotification(admin.id, {
      type: 'system_update',
      message: `⚠️ Alerte conformité : le taux de rejet du projet atteint ${pct}% (${rejectedCount}/${decided.length} décidés). Intervention recommandée.`,
      targetId: projectId,
      link: `/project/${projectId}`,
    }).catch(() => {})
  ));

  console.log(`[conformité] Alerte envoyée — projet ${projectId} : ${pct}% de rejet`);
}
