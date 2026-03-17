'use server';

import { db } from '@/db';
import { testTypes, projectTestTypes } from '@/db/schema';
import type { TestType, NewTestType } from '@/db/schema';
import { eq, or, isNull, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/serverAuth';

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Retourne les types de tests globaux (isDefault) + ceux de l'org
 */
export async function getTestTypes(orgId?: string | null): Promise<TestType[]> {
  const rows = await db
    .select()
    .from(testTypes)
    .where(
      orgId
        ? or(isNull(testTypes.organizationId), eq(testTypes.organizationId, orgId))
        : isNull(testTypes.organizationId)
    )
    .orderBy(testTypes.category, testTypes.name);

  return rows as TestType[];
}

export async function getTestTypeById(id: string): Promise<TestType | null> {
  const rows = await db
    .select()
    .from(testTypes)
    .where(eq(testTypes.id, id))
    .limit(1);
  return (rows[0] as TestType) ?? null;
}

/**
 * Types de tests disponibles sur un projet spécifique
 */
export async function getTestTypesForProject(projectId: string): Promise<TestType[]> {
  const rows = await db
    .select({ testType: testTypes })
    .from(projectTestTypes)
    .innerJoin(testTypes, eq(projectTestTypes.testTypeId, testTypes.id))
    .where(eq(projectTestTypes.projectId, projectId));

  return rows.map((r) => r.testType) as TestType[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTestType(
  data: Omit<NewTestType, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestType> {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  const [row] = await db
    .insert(testTypes)
    .values({ ...data })
    .returning();
  return row as TestType;
}

export async function updateTestType(
  id: string,
  data: Partial<Omit<NewTestType, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TestType | null> {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  const [row] = await db
    .update(testTypes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(testTypes.id, id))
    .returning();
  return (row as TestType) ?? null;
}

export async function deleteTestType(id: string): Promise<void> {
  await requireRole(['ADMIN']);
  await db.delete(testTypes).where(eq(testTypes.id, id));
}

// ─── Project ↔ TestType ───────────────────────────────────────────────────────

export async function assignTestTypeToProject(
  projectId: string,
  testTypeId: string
): Promise<void> {
  await db
    .insert(projectTestTypes)
    .values({ projectId, testTypeId })
    .onConflictDoNothing();
}

export async function removeTestTypeFromProject(
  projectId: string,
  testTypeId: string
): Promise<void> {
  await db
    .delete(projectTestTypes)
    .where(
      and(
        eq(projectTestTypes.projectId, projectId),
        eq(projectTestTypes.testTypeId, testTypeId)
      )
    );
}

export async function setProjectTestTypes(
  projectId: string,
  testTypeIds: string[]
): Promise<void> {
  // Remplacer tous les types du projet
  await db.delete(projectTestTypes).where(eq(projectTestTypes.projectId, projectId));
  if (testTypeIds.length > 0) {
    await db
      .insert(projectTestTypes)
      .values(testTypeIds.map((testTypeId) => ({ projectId, testTypeId })));
  }
}
