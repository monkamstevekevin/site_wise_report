'use server';

import { db } from '@/db';
import { reports, reportAttachments } from '@/db/schema';
import type { NewReport } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { FieldReport } from '@/lib/types';
import { addNotification } from './notificationService';

// ─── Mapper DB → type applicatif ─────────────────────────────────────────────

async function mapToFieldReport(row: typeof reports.$inferSelect): Promise<FieldReport> {
  const attachmentRows = await db
    .select({ fileUrl: reportAttachments.fileUrl })
    .from(reportAttachments)
    .where(eq(reportAttachments.reportId, row.id));

  return {
    id: row.id,
    projectId: row.projectId,
    technicianId: row.technicianId,
    materialType: row.materialType,
    temperature: Number(row.temperature),
    volume: Number(row.volume),
    density: Number(row.density),
    humidity: Number(row.humidity),
    batchNumber: row.batchNumber,
    supplier: row.supplier,
    samplingMethod: row.samplingMethod,
    notes: row.notes ?? undefined,
    status: row.status,
    attachments: attachmentRows.map((a) => a.fileUrl),
    photoDataUri: row.photoUrl ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    aiIsAnomalous: row.aiIsAnomalous ?? undefined,
    aiAnomalyExplanation: row.aiAnomalyExplanation ?? undefined,
    testTypeId: row.testTypeId ?? null,
    testData: (row.testData as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getReports(): Promise<FieldReport[]> {
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
  return Promise.all(rows.map(mapToFieldReport));
}

export async function getReportsByTechnicianId(technicianId: string): Promise<FieldReport[]> {
  if (!technicianId) return [];
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.technicianId, technicianId))
    .orderBy(desc(reports.createdAt));
  return Promise.all(rows.map(mapToFieldReport));
}

export async function getReportById(reportId: string): Promise<FieldReport | null> {
  const rows = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  return rows.length > 0 ? mapToFieldReport(rows[0]) : null;
}

export async function addReport(
  reportData: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'> & {
    testTypeId?: string | null;
    testData?: Record<string, unknown> | null;
    organizationId?: string | null;
  }
): Promise<string> {
  const newReport: NewReport = {
    projectId: reportData.projectId,
    technicianId: reportData.technicianId,
    materialType: reportData.materialType as NewReport['materialType'],
    temperature: reportData.temperature.toString(),
    volume: reportData.volume.toString(),
    density: reportData.density.toString(),
    humidity: reportData.humidity.toString(),
    batchNumber: reportData.batchNumber,
    supplier: reportData.supplier,
    samplingMethod: reportData.samplingMethod as NewReport['samplingMethod'],
    notes: reportData.notes ?? null,
    status: reportData.status as NewReport['status'],
    photoUrl: reportData.photoDataUri ?? null,
    rejectionReason: reportData.rejectionReason ?? null,
    aiIsAnomalous: reportData.aiIsAnomalous ?? null,
    aiAnomalyExplanation: reportData.aiAnomalyExplanation ?? null,
    testTypeId: reportData.testTypeId ?? null,
    testData: reportData.testData ?? null,
    organizationId: reportData.organizationId ?? null,
  };

  const [created] = await db
    .insert(reports)
    .values(newReport)
    .returning({ id: reports.id });

  // Insérer les pièces jointes si présentes
  if (reportData.attachments && reportData.attachments.length > 0) {
    await db.insert(reportAttachments).values(
      reportData.attachments.map((url) => ({
        reportId: created.id,
        fileUrl: url,
        fileName: url.split('/').pop() ?? 'attachment',
      }))
    );
  }

  return created.id;
}

export async function updateReport(
  reportId: string,
  reportData: Partial<Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'projectId'>>
): Promise<void> {
  // Récupérer le rapport actuel pour les notifications
  const currentRows = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (currentRows.length === 0) throw new Error(`Rapport avec ID ${reportId} non trouvé.`);
  const current = currentRows[0];

  const updateData: Partial<typeof reports.$inferInsert> = { updatedAt: new Date() };

  if (reportData.status !== undefined) updateData.status = reportData.status;
  if (reportData.notes !== undefined) updateData.notes = reportData.notes ?? null;
  if (reportData.temperature !== undefined) updateData.temperature = reportData.temperature.toString();
  if (reportData.volume !== undefined) updateData.volume = reportData.volume.toString();
  if (reportData.density !== undefined) updateData.density = reportData.density.toString();
  if (reportData.humidity !== undefined) updateData.humidity = reportData.humidity.toString();
  if (reportData.batchNumber !== undefined) updateData.batchNumber = reportData.batchNumber;
  if (reportData.supplier !== undefined) updateData.supplier = reportData.supplier;
  if (reportData.samplingMethod !== undefined) updateData.samplingMethod = reportData.samplingMethod as typeof updateData.samplingMethod;
  if (reportData.photoDataUri !== undefined) updateData.photoUrl = reportData.photoDataUri ?? null;
  if (reportData.aiIsAnomalous !== undefined) updateData.aiIsAnomalous = reportData.aiIsAnomalous ?? null;
  if (reportData.aiAnomalyExplanation !== undefined) updateData.aiAnomalyExplanation = reportData.aiAnomalyExplanation ?? null;
  if (reportData.testTypeId !== undefined) updateData.testTypeId = reportData.testTypeId ?? null;
  if (reportData.testData !== undefined) updateData.testData = reportData.testData ?? null;

  // Nettoyer la raison de rejet si le statut n'est plus REJECTED
  if (reportData.status && reportData.status !== 'REJECTED') {
    updateData.rejectionReason = null;
  } else if (reportData.rejectionReason !== undefined) {
    updateData.rejectionReason = reportData.rejectionReason ?? null;
  }

  await db.update(reports).set(updateData).where(eq(reports.id, reportId));

  // Mettre à jour les pièces jointes si fournies
  if (reportData.attachments !== undefined) {
    await db.delete(reportAttachments).where(eq(reportAttachments.reportId, reportId));
    if (reportData.attachments.length > 0) {
      await db.insert(reportAttachments).values(
        reportData.attachments.map((url) => ({
          reportId,
          fileUrl: url,
          fileName: url.split('/').pop() ?? 'attachment',
        }))
      );
    }
  }

  // Notifications sur changement de statut
  const technicianId = current.technicianId;
  const projectId = current.projectId;

  if (technicianId && reportData.status) {
    if (reportData.status === 'VALIDATED') {
      await addNotification(technicianId, {
        type: 'report_update',
        message: `Votre rapport #${reportId.substring(0, 6)}... pour le projet PJT-${projectId.substring(0, 4)}... a été VALIDÉ.`,
        targetId: reportId,
        link: `/reports/view/${reportId}`,
      });
    } else if (reportData.status === 'REJECTED') {
      const reason = reportData.rejectionReason || 'Aucune raison spécifique fournie.';
      await addNotification(technicianId, {
        type: 'report_update',
        message: `Votre rapport #${reportId.substring(0, 6)}... pour le projet PJT-${projectId.substring(0, 4)}... a été REJETÉ. Raison : ${reason}`,
        targetId: reportId,
        link: `/reports/edit/${reportId}`,
      });
    }
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  // Les pièces jointes sont supprimées en CASCADE
  await db.delete(reports).where(eq(reports.id, reportId));
}
