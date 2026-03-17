'use server';

import { db } from '@/db';
import { projects, projectMaterials, userAssignments } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Project } from '@/lib/types';
import type { ProjectFormData } from '@/app/(app)/admin/projects/components/ProjectFormDialog';
import { requireRole } from '@/lib/auth/serverAuth';

export type ProjectSubmitData = Omit<ProjectFormData, 'assignedMaterialTypes'> & {
  assignedMaterialIds?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
};

// ─── Mapper DB → type applicatif ─────────────────────────────────────────────

async function mapToProject(
  row: typeof projects.$inferSelect,
  materialIds?: string[]
): Promise<Project> {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description ?? undefined,
    status: row.status,
    startDate: row.startDate?.toISOString() ?? undefined,
    endDate: row.endDate?.toISOString() ?? undefined,
    assignedMaterialIds: materialIds ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getMaterialIdsForProject(projectId: string): Promise<string[]> {
  const rows = await db
    .select({ materialId: projectMaterials.materialId })
    .from(projectMaterials)
    .where(eq(projectMaterials.projectId, projectId));
  return rows.map((r) => r.materialId);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getProjects(orgId?: string): Promise<Project[]> {
  // Sans orgId, on ne retourne rien pour éviter la fuite cross-tenant
  if (!orgId) return [];
  const rows = await db.select().from(projects).where(eq(projects.organizationId, orgId)).orderBy(desc(projects.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const materialIds = await getMaterialIdsForProject(row.id);
      return mapToProject(row, materialIds);
    })
  );
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (rows.length === 0) return null;

  const materialIds = await getMaterialIdsForProject(projectId);
  return mapToProject(rows[0], materialIds);
}

export async function addProject(projectData: ProjectSubmitData, orgId?: string | null): Promise<string> {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  const [created] = await db
    .insert(projects)
    .values({
      name: projectData.name,
      location: projectData.location,
      description: projectData.description ?? null,
      status: projectData.status,
      startDate: projectData.startDate ? new Date(projectData.startDate) : null,
      endDate: projectData.endDate ? new Date(projectData.endDate) : null,
      organizationId: orgId ?? null,
    })
    .returning({ id: projects.id });

  if (projectData.assignedMaterialIds && projectData.assignedMaterialIds.length > 0) {
    await db.insert(projectMaterials).values(
      projectData.assignedMaterialIds.map((materialId) => ({
        projectId: created.id,
        materialId,
      }))
    );
  }

  return created.id;
}

export async function updateProject(
  projectId: string,
  projectData: Partial<ProjectSubmitData>
): Promise<void> {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  await db
    .update(projects)
    .set({
      ...(projectData.name && { name: projectData.name }),
      ...(projectData.location && { location: projectData.location }),
      ...(projectData.description !== undefined && { description: projectData.description ?? null }),
      ...(projectData.status && { status: projectData.status }),
      ...(Object.hasOwn(projectData, 'startDate') && {
        startDate: projectData.startDate ? new Date(projectData.startDate as string) : null,
      }),
      ...(Object.hasOwn(projectData, 'endDate') && {
        endDate: projectData.endDate ? new Date(projectData.endDate as string) : null,
      }),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  if (Object.hasOwn(projectData, 'assignedMaterialIds')) {
    await db.delete(projectMaterials).where(eq(projectMaterials.projectId, projectId));

    if (projectData.assignedMaterialIds && projectData.assignedMaterialIds.length > 0) {
      await db.insert(projectMaterials).values(
        projectData.assignedMaterialIds.map((materialId) => ({
          projectId,
          materialId,
        }))
      );
    }
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  await requireRole(['ADMIN']);
  if (!projectId) throw new Error("L'ID du projet est requis pour supprimer un projet.");
  await db.delete(projects).where(eq(projects.id, projectId));
}
