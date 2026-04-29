'use server';

import { db } from '@/db';
import { reports, reportAttachments } from '@/db/schema';
import type { NewReport } from '@/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import type { FieldReport } from '@/lib/types';
import { addNotification } from './notificationService';
import { requireRole } from '@/lib/auth/serverAuth';
import { getTestTypeById } from './testTypeService';
import { encryptField, decryptField, encryptJson, decryptJson } from '@/lib/crypto';

// ─── Type narrowing helpers ───────────────────────────────────────────────────

const VALID_MATERIAL_TYPES = ['cement', 'asphalt', 'gravel', 'sand', 'other', 'compaction'] as const;
type ValidMaterialType = typeof VALID_MATERIAL_TYPES[number];

function assertMaterialType(value: string): asserts value is ValidMaterialType {
  if (!(VALID_MATERIAL_TYPES as readonly string[]).includes(value)) {
    throw new Error(
      `Type de matériau invalide : "${value}". Valeurs acceptées : ${VALID_MATERIAL_TYPES.join(', ')}.`
    );
  }
}

const VALID_SAMPLING_METHODS = ['grab', 'composite', 'core', 'other'] as const;
type ValidSamplingMethod = typeof VALID_SAMPLING_METHODS[number];

function assertSamplingMethod(value: string): asserts value is ValidSamplingMethod {
  if (!(VALID_SAMPLING_METHODS as readonly string[]).includes(value)) {
    throw new Error(
      `Méthode d'échantillonnage invalide : "${value}". Valeurs acceptées : ${VALID_SAMPLING_METHODS.join(', ')}.`
    );
  }
}

// ─── Batch fetch des pièces jointes ──────────────────────────────────────────

async function fetchAttachmentsByReportIds(
  reportIds: string[]
): Promise<Map<string, string[]>> {
  if (reportIds.length === 0) return new Map();

  const rows = await db
    .select({ reportId: reportAttachments.reportId, fileUrl: reportAttachments.fileUrl })
    .from(reportAttachments)
    .where(inArray(reportAttachments.reportId, reportIds));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.reportId) ?? [];
    existing.push(row.fileUrl);
    map.set(row.reportId, existing);
  }
  return map;
}

// ─── Validation des données de test ──────────────────────────────────────────

async function validateTestData(
  testTypeId: string | null | undefined,
  testData: Record<string, unknown> | null | undefined
): Promise<void> {
  if (!testTypeId || !testData) return;

  const testType = await getTestTypeById(testTypeId);
  if (!testType) return;

  const errors: string[] = [];

  for (const fieldDef of testType.fields) {
    const raw = testData[fieldDef.key];
    const strVal = raw !== null && raw !== undefined ? String(raw).trim() : '';

    if (fieldDef.required && strVal === '') {
      errors.push(`"${fieldDef.label}" est requis`);
      continue;
    }

    if (strVal === '') continue; // champ optionnel vide → OK

    if (fieldDef.type === 'number') {
      const num = parseFloat(strVal);
      if (isNaN(num)) {
        errors.push(`"${fieldDef.label}" doit être un nombre valide`);
      } else {
        if (fieldDef.min !== undefined && num < fieldDef.min)
          errors.push(`"${fieldDef.label}" doit être ≥ ${fieldDef.min}`);
        if (fieldDef.max !== undefined && num > fieldDef.max)
          errors.push(`"${fieldDef.label}" doit être ≤ ${fieldDef.max}`);
      }
    } else if (fieldDef.type === 'select' && fieldDef.options) {
      if (!fieldDef.options.includes(strVal)) {
        errors.push(`"${fieldDef.label}" : valeur "${strVal}" non autorisée`);
      }
    } else if (fieldDef.type === 'boolean') {
      if (strVal !== 'true' && strVal !== 'false') {
        errors.push(`"${fieldDef.label}" doit être true ou false`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Données de test invalides : ${errors.join(' ; ')}`);
  }
}

// ─── Validation des URLs de pièces jointes ───────────────────────────────────

function sanitizeAttachmentUrls(urls: string[]): string[] {
  return urls.filter(url => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  });
}

// ─── Mapper DB → type applicatif ─────────────────────────────────────────────

function mapToFieldReport(
  row: typeof reports.$inferSelect,
  attachmentsMap: Map<string, string[]>
): FieldReport {
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
    notes: decryptField(row.notes) ?? undefined,
    status: row.status,
    attachments: attachmentsMap.get(row.id) ?? [],
    photoDataUri: row.photoUrl ?? undefined,
    rejectionReason: decryptField(row.rejectionReason) ?? undefined,
    aiIsAnomalous: row.aiIsAnomalous ?? undefined,
    aiAnomalyExplanation: decryptField(row.aiAnomalyExplanation) ?? undefined,
    testTypeId: row.testTypeId ?? null,
    testData: decryptJson(row.testData as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getReports(orgId?: string | null): Promise<FieldReport[]> {
  if (!orgId) return [];
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.organizationId, orgId))
    .orderBy(desc(reports.createdAt));
  const attachmentsMap = await fetchAttachmentsByReportIds(rows.map((r) => r.id));
  return rows.map((row) => mapToFieldReport(row, attachmentsMap));
}

export async function getReportsByTechnicianId(technicianId: string): Promise<FieldReport[]> {
  if (!technicianId) return [];
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.technicianId, technicianId))
    .orderBy(desc(reports.createdAt));
  const attachmentsMap = await fetchAttachmentsByReportIds(rows.map((r) => r.id));
  return rows.map((row) => mapToFieldReport(row, attachmentsMap));
}

export async function getReportById(reportId: string, orgId?: string | null): Promise<FieldReport | null> {
  const condition = orgId
    ? and(eq(reports.id, reportId), eq(reports.organizationId, orgId))
    : eq(reports.id, reportId);
  const rows = await db.select().from(reports).where(condition).limit(1);
  if (rows.length === 0) return null;
  const attachmentsMap = await fetchAttachmentsByReportIds([rows[0].id]);
  return mapToFieldReport(rows[0], attachmentsMap);
}

export async function addReport(
  reportData: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'> & {
    testTypeId?: string | null;
    testData?: Record<string, unknown> | null;
    organizationId?: string | null;
  }
): Promise<string> {
  // Validation serveur des données de test structurées
  await validateTestData(reportData.testTypeId, reportData.testData);

  // Valider les enums avant construction — évite les casts silencieux
  assertMaterialType(reportData.materialType);
  assertSamplingMethod(reportData.samplingMethod);

  const newReport: NewReport = {
    projectId: reportData.projectId,
    technicianId: reportData.technicianId,
    materialType: reportData.materialType,
    temperature: reportData.temperature.toString(),
    volume: reportData.volume.toString(),
    density: reportData.density.toString(),
    humidity: reportData.humidity.toString(),
    batchNumber: reportData.batchNumber,
    supplier: reportData.supplier,
    samplingMethod: reportData.samplingMethod,
    notes: encryptField(reportData.notes ?? null),
    status: reportData.status as NewReport['status'],
    photoUrl: reportData.photoDataUri ?? null,
    rejectionReason: encryptField(reportData.rejectionReason ?? null),
    aiIsAnomalous: reportData.aiIsAnomalous ?? null,
    aiAnomalyExplanation: encryptField(reportData.aiAnomalyExplanation ?? null),
    testTypeId: reportData.testTypeId ?? null,
    testData: encryptJson(reportData.testData ?? null),
    organizationId: reportData.organizationId ?? null,
  };

  const [created] = await db
    .insert(reports)
    .values(newReport)
    .returning({ id: reports.id });

  // Insérer les pièces jointes — seules les URLs http/https sont acceptées
  const safeAttachments = sanitizeAttachmentUrls(reportData.attachments ?? []);
  if (safeAttachments.length > 0) {
    await db.insert(reportAttachments).values(
      safeAttachments.map((url) => ({
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
  // Seuls les ADMIN et SUPERVISOR peuvent changer le statut vers VALIDATED ou REJECTED
  if (reportData.status === 'VALIDATED' || reportData.status === 'REJECTED') {
    await requireRole(['ADMIN', 'SUPERVISOR']);
  }

  // Validation serveur des données de test structurées (si mises à jour)
  if (reportData.testTypeId !== undefined || reportData.testData !== undefined) {
    // Résoudre le testTypeId définitif pour la validation
    const effectiveTestTypeId = reportData.testTypeId !== undefined
      ? reportData.testTypeId
      : (await db.select({ testTypeId: reports.testTypeId }).from(reports).where(eq(reports.id, reportId)).limit(1))[0]?.testTypeId;
    await validateTestData(effectiveTestTypeId, reportData.testData);
  }

  // Récupérer le rapport actuel pour les notifications
  const currentRows = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (currentRows.length === 0) throw new Error(`Rapport avec ID ${reportId} non trouvé.`);
  const current = currentRows[0];

  const updateData: Partial<typeof reports.$inferInsert> = { updatedAt: new Date() };

  if (reportData.status !== undefined) updateData.status = reportData.status;
  if (reportData.notes !== undefined) updateData.notes = encryptField(reportData.notes ?? null);
  if (reportData.temperature !== undefined) updateData.temperature = reportData.temperature.toString();
  if (reportData.volume !== undefined) updateData.volume = reportData.volume.toString();
  if (reportData.density !== undefined) updateData.density = reportData.density.toString();
  if (reportData.humidity !== undefined) updateData.humidity = reportData.humidity.toString();
  if (reportData.batchNumber !== undefined) updateData.batchNumber = reportData.batchNumber;
  if (reportData.supplier !== undefined) updateData.supplier = reportData.supplier;
  if (reportData.samplingMethod !== undefined) {
    assertSamplingMethod(reportData.samplingMethod);
    updateData.samplingMethod = reportData.samplingMethod;
  }
  if (reportData.photoDataUri !== undefined) updateData.photoUrl = reportData.photoDataUri ?? null;
  if (reportData.aiIsAnomalous !== undefined) updateData.aiIsAnomalous = reportData.aiIsAnomalous ?? null;
  if (reportData.aiAnomalyExplanation !== undefined) updateData.aiAnomalyExplanation = encryptField(reportData.aiAnomalyExplanation ?? null);
  if (reportData.testTypeId !== undefined) updateData.testTypeId = reportData.testTypeId ?? null;
  if (reportData.testData !== undefined) updateData.testData = encryptJson(reportData.testData ?? null);

  // Nettoyer la raison de rejet si le statut n'est plus REJECTED
  if (reportData.status && reportData.status !== 'REJECTED') {
    updateData.rejectionReason = null;
  } else if (reportData.rejectionReason !== undefined) {
    updateData.rejectionReason = encryptField(reportData.rejectionReason ?? null);
  }

  await db.update(reports).set(updateData).where(eq(reports.id, reportId));

  // Mettre à jour les pièces jointes — seules les URLs http/https sont acceptées
  if (reportData.attachments !== undefined) {
    await db.delete(reportAttachments).where(eq(reportAttachments.reportId, reportId));
    const safeAttachments = sanitizeAttachmentUrls(reportData.attachments);
    if (safeAttachments.length > 0) {
      await db.insert(reportAttachments).values(
        safeAttachments.map((url) => ({
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
