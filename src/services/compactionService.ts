'use server';

import { db } from '@/db';
import { compactionTestRows } from '@/db/schema';
import type { NewCompactionTestRow, CompactionTestRow } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/serverAuth';

export async function getCompactionRowsByReport(reportId: string): Promise<CompactionTestRow[]> {
  await requireRole(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);
  return db
    .select()
    .from(compactionTestRows)
    .where(eq(compactionTestRows.reportId, reportId))
    .orderBy(asc(compactionTestRows.rowOrder));
}

export async function getCompactionRowsByProject(projectId: string): Promise<CompactionTestRow[]> {
  await requireRole(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);
  return db
    .select()
    .from(compactionTestRows)
    .where(eq(compactionTestRows.projectId, projectId))
    .orderBy(asc(compactionTestRows.rowOrder));
}

export async function bulkCreateCompactionRows(
  rows: NewCompactionTestRow[]
): Promise<CompactionTestRow[]> {
  await requireRole(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);
  if (rows.length === 0) return [];
  return db.insert(compactionTestRows).values(rows).returning();
}

export async function deleteCompactionRowsByReport(reportId: string): Promise<void> {
  await requireRole(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']);
  await db
    .delete(compactionTestRows)
    .where(eq(compactionTestRows.reportId, reportId));
}
