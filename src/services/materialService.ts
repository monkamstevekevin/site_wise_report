'use server';

import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Material, MaterialType } from '@/lib/types';
import type { MaterialSubmitData } from '@/app/(app)/admin/materials/components/MaterialFormDialog';

// ─── Mapper DB → type applicatif ─────────────────────────────────────────────

function mapToMaterial(row: typeof materials.$inferSelect): Material {
  return {
    id: row.id,
    name: row.name,
    type: row.type as MaterialType,
    validationRules: {
      minDensity: row.minDensity ? Number(row.minDensity) : undefined,
      maxDensity: row.maxDensity ? Number(row.maxDensity) : undefined,
      minTemperature: row.minTemperature ? Number(row.minTemperature) : undefined,
      maxTemperature: row.maxTemperature ? Number(row.maxTemperature) : undefined,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getMaterials(): Promise<Material[]> {
  const rows = await db.select().from(materials).orderBy(asc(materials.name));
  return rows.map(mapToMaterial);
}

export async function getMaterialById(materialId: string): Promise<Material | null> {
  const rows = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  return rows.length > 0 ? mapToMaterial(rows[0]) : null;
}

export async function addMaterial(materialData: MaterialSubmitData): Promise<string> {
  const [created] = await db
    .insert(materials)
    .values({
      name: materialData.name,
      type: materialData.type as MaterialType,
      minDensity: materialData.validationRules?.minDensity?.toString() ?? null,
      maxDensity: materialData.validationRules?.maxDensity?.toString() ?? null,
      minTemperature: materialData.validationRules?.minTemperature?.toString() ?? null,
      maxTemperature: materialData.validationRules?.maxTemperature?.toString() ?? null,
    })
    .returning({ id: materials.id });
  return created.id;
}

export async function updateMaterial(materialId: string, materialData: MaterialSubmitData): Promise<void> {
  await db
    .update(materials)
    .set({
      name: materialData.name,
      type: materialData.type as MaterialType,
      minDensity: materialData.validationRules?.minDensity?.toString() ?? null,
      maxDensity: materialData.validationRules?.maxDensity?.toString() ?? null,
      minTemperature: materialData.validationRules?.minTemperature?.toString() ?? null,
      maxTemperature: materialData.validationRules?.maxTemperature?.toString() ?? null,
      updatedAt: new Date(),
    })
    .where(eq(materials.id, materialId));
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await db.delete(materials).where(eq(materials.id, materialId));
}
