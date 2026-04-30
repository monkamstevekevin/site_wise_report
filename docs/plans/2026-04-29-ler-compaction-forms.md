# LER Compaction Forms (RC-6306 & RC-6304) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement two LER compaction control forms — RC-6306 (daily site report filled by technician) and RC-6304 (client summary aggregating all tests for a project).

**Architecture:** Add `'compaction'` to the existing `materialTypeEnum`, create a new `compaction_test_rows` table for individual measurement rows (linked to a report), store compaction header data (materials, work type) in the existing `testData` JSONB column, and render two distinct PDF components. The `ReportForm` detects `materialType === 'compaction'` and swaps the generic fields for compaction-specific UI.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Supabase PostgreSQL, TypeScript, @react-pdf/renderer, shadcn/ui, react-hook-form

---

## Background: Two-Document Workflow

| Form | Code | Who fills it | When | Purpose |
|------|------|-------------|------|---------|
| Rapport journalier compacité | RC-6306 | Technician on site | Daily | Qualitative (C/NC) per visit |
| Résumé d'essais compacité | RC-6304 | Sent to client | End of project | Quantitative summary of all field tests |

Both use the same `compaction_test_rows` data, just displayed differently in PDF.

---

## Task 1: DB Migration SQL

**Files:**
- Create: `supabase/migrations/20260429000001_compaction.sql`

**Step 1: Write the migration file**

```sql
-- 1. Add 'compaction' to material_type enum
ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'compaction';

-- 2. Create compaction_test_rows table
CREATE TABLE IF NOT EXISTS "compaction_test_rows" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id"           uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "project_id"          uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "organization_id"     uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "row_order"           integer NOT NULL DEFAULT 0,
  -- RC-6304 quantitative fields
  "localisation"        text,
  "test_date"           date,
  "water_content"       numeric(6,2),    -- Teneur en eau (%)
  "dry_density"         numeric(8,2),    -- Masse volumique sèche (kg/m³)
  "retained_5mm"        numeric(6,2),    -- Retenu 5mm (%)
  "corrected_density"   numeric(8,2),    -- Masse volumique corrigée (kg/m³)
  "compaction_percent"  numeric(6,2),    -- % de compacité
  -- RC-6306 qualitative fields
  "material_ref"        text,            -- 'mat1' | 'mat2'
  "required_percent"    numeric(6,2),    -- % exigé
  "is_compliant"        boolean,         -- C (true) / NC (false)
  "sample_taken"        boolean,         -- Prélèvement O/N
  "sample_no"           text,            -- No Échantillons
  "remarks"             text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX "ctr_report_id_idx"   ON "compaction_test_rows"("report_id");
CREATE INDEX "ctr_project_id_idx"  ON "compaction_test_rows"("project_id");
CREATE INDEX "ctr_org_id_idx"      ON "compaction_test_rows"("organization_id");

-- 4. RLS
ALTER TABLE "compaction_test_rows" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read their compaction rows"
  ON "compaction_test_rows" FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "technicians can insert compaction rows"
  ON "compaction_test_rows" FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "technicians can update their compaction rows"
  ON "compaction_test_rows" FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins can delete compaction rows"
  ON "compaction_test_rows" FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

**Step 2: Apply the migration in Supabase dashboard**

Go to Supabase Dashboard → SQL Editor → paste the migration → Run.

**Step 3: Commit**

```bash
git add supabase/migrations/20260429000001_compaction.sql
git commit -m "feat: add compaction_test_rows table and enum value"
```

---

## Task 2: Update schema.ts (Drizzle definitions)

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Add 'compaction' to materialTypeEnum**

In `schema.ts` at line ~27, change:
```typescript
export const materialTypeEnum = pgEnum('material_type', [
  'cement',
  'asphalt',
  'gravel',
  'sand',
  'other',
]);
```
to:
```typescript
export const materialTypeEnum = pgEnum('material_type', [
  'cement',
  'asphalt',
  'gravel',
  'sand',
  'other',
  'compaction',
]);
```

**Step 2: Add compactionTestRows table** (after the `reportAttachments` table definition, around line 301)

```typescript
/**
 * compaction_test_rows — individual test measurements for compaction reports
 * Used for both RC-6306 (daily, qualitative) and RC-6304 (client summary, quantitative)
 */
export const compactionTestRows = pgTable(
  'compaction_test_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    rowOrder: numeric('row_order', { precision: 4, scale: 0 }).notNull().default('0'),
    // Quantitative (RC-6304)
    localisation: text('localisation'),
    testDate: text('test_date'), // stored as ISO date string 'YYYY-MM-DD'
    waterContent: numeric('water_content', { precision: 6, scale: 2 }),
    dryDensity: numeric('dry_density', { precision: 8, scale: 2 }),
    retained5mm: numeric('retained_5mm', { precision: 6, scale: 2 }),
    correctedDensity: numeric('corrected_density', { precision: 8, scale: 2 }),
    compactionPercent: numeric('compaction_percent', { precision: 6, scale: 2 }),
    // Qualitative (RC-6306)
    materialRef: text('material_ref'), // 'mat1' | 'mat2'
    requiredPercent: numeric('required_percent', { precision: 6, scale: 2 }),
    isCompliant: boolean('is_compliant'),
    sampleTaken: boolean('sample_taken'),
    sampleNo: text('sample_no'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('ctr_report_id_idx').on(table.reportId),
    index('ctr_project_id_idx').on(table.projectId),
    index('ctr_org_id_idx').on(table.organizationId),
  ]
);
```

**Step 3: Add TypeScript types and CompactionReportData interface** (at the bottom of schema.ts)

```typescript
export type CompactionTestRow = typeof compactionTestRows.$inferSelect;
export type NewCompactionTestRow = typeof compactionTestRows.$inferInsert;

/** Header data stored in reports.testData for compaction reports */
export interface CompactionReportData {
  // Timing
  arrivalTime: string;     // 'HH:MM'
  departureTime: string;   // 'HH:MM'
  nucleoNo?: string;       // Nucléodensimètre No (RC-6304)
  // Materials
  material1: {
    name: string;
    source: string;
    maxDensity: number;        // Masse volumique max (kg/m³)
    densityMethod: 'proctor' | 'planche';
    optimalMoisture: number;   // Teneur en eau optimale (%)
    compactionReq: number;     // Exigence compaction (90|95|98)
  };
  material2?: {
    name: string;
    source: string;
    maxDensity: number;
    densityMethod: 'proctor' | 'planche';
    optimalMoisture: number;
    compactionReq: number;
  };
  // Work type & location
  workType: 'ROUTE' | 'BATIMENT';
  workCategory: string;     // e.g. 'infrastructure', 'semelles', etc.
  chainageFrom?: string;
  chainageTo?: string;
  axis?: string;
  entrepreneur?: string;
  subcontractor?: string;
}
```

**Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: update Drizzle schema for compaction"
```

---

## Task 3: compactionService.ts

**Files:**
- Create: `src/services/compactionService.ts`

**Step 1: Write the service**

```typescript
'use server';

import { db } from '@/db';
import { compactionTestRows } from '@/db/schema';
import type { NewCompactionTestRow, CompactionTestRow } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
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
```

**Step 2: Commit**

```bash
git add src/services/compactionService.ts
git commit -m "feat: add compactionService for test rows CRUD"
```

---

## Task 4: API route for compaction rows

**Files:**
- Create: `src/app/api/compaction-rows/route.ts`

The API route is needed so we can call `bulkCreateCompactionRows` after report creation from the client.

```typescript
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, reports, compactionTestRows } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
    // Verify IDOR
    const [report] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.organizationId, dbUser.organizationId)));
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rows = await db
      .select()
      .from(compactionTestRows)
      .where(eq(compactionTestRows.reportId, reportId));
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: 'Provide reportId or projectId' }, { status: 400 });
}
```

**Add route to middleware.ts rate limiting** — modify `API_ROUTES` in `src/middleware.ts`:

```typescript
const API_ROUTES = [
  '/api/time-entries',
  '/api/admin/recommendations',
  '/api/admin/users-activity',
  '/api/compaction-rows',
];
```

**Step 2: Commit**

```bash
git add src/app/api/compaction-rows/route.ts src/middleware.ts
git commit -m "feat: add compaction-rows API route"
```

---

## Task 5: CompactionHeaderForm component

**Files:**
- Create: `src/components/compaction/CompactionHeaderForm.tsx`

This component renders the RC-6306 header fields (arrival/departure time, materials, work type). It calls `onChange` whenever any field changes, so the parent form can collect data.

```typescript
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompactionReportData } from '@/db/schema';

interface CompactionHeaderFormProps {
  value: Partial<CompactionReportData>;
  onChange: (data: Partial<CompactionReportData>) => void;
}

const WORK_CATEGORIES_ROUTE = [
  { value: 'coussin_conduites', label: 'Coussin conduites' },
  { value: 'enrobage', label: 'Enrobage' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const WORK_CATEGORIES_BATIMENT = [
  { value: 'semelles', label: 'Semelles' },
  { value: 'dalles', label: 'Dalles' },
  { value: 'murs', label: 'Murs' },
  { value: 'stationnement', label: 'Stationnement' },
];

const COMPACTION_REQS = [
  { value: '90', label: '90%' },
  { value: '95', label: '95%' },
  { value: '98', label: '98%' },
];

export function CompactionHeaderForm({ value, onChange }: CompactionHeaderFormProps) {
  const set = (patch: Partial<CompactionReportData>) => onChange({ ...value, ...patch });
  const setMat1 = (patch: Partial<CompactionReportData['material1']>) =>
    set({ material1: { ...defaultMat, ...value.material1, ...patch } });
  const setMat2 = (patch: Partial<NonNullable<CompactionReportData['material2']>>) =>
    set({ material2: { ...defaultMat, ...value.material2, ...patch } });

  const workCategories = value.workType === 'BATIMENT' ? WORK_CATEGORIES_BATIMENT : WORK_CATEGORIES_ROUTE;

  return (
    <div className="space-y-4">
      {/* Timing */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Horaires</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Heure arrivée</Label>
            <Input type="time" value={value.arrivalTime ?? ''} onChange={e => set({ arrivalTime: e.target.value })} />
          </div>
          <div>
            <Label>Heure départ</Label>
            <Input type="time" value={value.departureTime ?? ''} onChange={e => set({ departureTime: e.target.value })} />
          </div>
          <div>
            <Label>No Nucléodensimètre</Label>
            <Input value={value.nucleoNo ?? ''} onChange={e => set({ nucleoNo: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Material 1 */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Matériau 1</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom / Description</Label>
            <Input value={value.material1?.name ?? ''} onChange={e => setMat1({ name: e.target.value })} />
          </div>
          <div>
            <Label>Provenance</Label>
            <Input value={value.material1?.source ?? ''} onChange={e => setMat1({ source: e.target.value })} />
          </div>
          <div>
            <Label>Masse vol. max (kg/m³)</Label>
            <Input type="number" value={value.material1?.maxDensity ?? ''} onChange={e => setMat1({ maxDensity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Méthode</Label>
            <Select value={value.material1?.densityMethod ?? ''} onValueChange={(v) => setMat1({ densityMethod: v as 'proctor' | 'planche' })}>
              <SelectTrigger><SelectValue placeholder="Proctor / Planche" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proctor">Proctor</SelectItem>
                <SelectItem value="planche">Planche d'essai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teneur eau opt. (%)</Label>
            <Input type="number" value={value.material1?.optimalMoisture ?? ''} onChange={e => setMat1({ optimalMoisture: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Exigence compaction</Label>
            <Select value={String(value.material1?.compactionReq ?? '')} onValueChange={(v) => setMat1({ compactionReq: Number(v) })}>
              <SelectTrigger><SelectValue placeholder="%" /></SelectTrigger>
              <SelectContent>
                {COMPACTION_REQS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Material 2 (optional) */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Matériau 2 (optionnel)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom / Description</Label>
            <Input value={value.material2?.name ?? ''} onChange={e => setMat2({ name: e.target.value })} placeholder="Laisser vide si un seul matériau" />
          </div>
          <div>
            <Label>Provenance</Label>
            <Input value={value.material2?.source ?? ''} onChange={e => setMat2({ source: e.target.value })} />
          </div>
          <div>
            <Label>Masse vol. max (kg/m³)</Label>
            <Input type="number" value={value.material2?.maxDensity ?? ''} onChange={e => setMat2({ maxDensity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Méthode</Label>
            <Select value={value.material2?.densityMethod ?? ''} onValueChange={(v) => setMat2({ densityMethod: v as 'proctor' | 'planche' })}>
              <SelectTrigger><SelectValue placeholder="Proctor / Planche" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proctor">Proctor</SelectItem>
                <SelectItem value="planche">Planche d'essai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teneur eau opt. (%)</Label>
            <Input type="number" value={value.material2?.optimalMoisture ?? ''} onChange={e => setMat2({ optimalMoisture: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Exigence compaction</Label>
            <Select value={String(value.material2?.compactionReq ?? '')} onValueChange={(v) => setMat2({ compactionReq: Number(v) })}>
              <SelectTrigger><SelectValue placeholder="%" /></SelectTrigger>
              <SelectContent>
                {COMPACTION_REQS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work type & location */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Type de travaux</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={value.workType ?? ''} onValueChange={(v) => set({ workType: v as 'ROUTE' | 'BATIMENT', workCategory: '' })}>
              <SelectTrigger><SelectValue placeholder="Route / Bâtiment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTE">Route</SelectItem>
                <SelectItem value="BATIMENT">Bâtiment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={value.workCategory ?? ''} onValueChange={(v) => set({ workCategory: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {workCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chaînage de</Label>
            <Input value={value.chainageFrom ?? ''} onChange={e => set({ chainageFrom: e.target.value })} placeholder="0+000" />
          </div>
          <div>
            <Label>Chaînage à</Label>
            <Input value={value.chainageTo ?? ''} onChange={e => set({ chainageTo: e.target.value })} placeholder="0+100" />
          </div>
          <div>
            <Label>Entrepreneur</Label>
            <Input value={value.entrepreneur ?? ''} onChange={e => set({ entrepreneur: e.target.value })} />
          </div>
          <div>
            <Label>Sous-traitant</Label>
            <Input value={value.subcontractor ?? ''} onChange={e => set({ subcontractor: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const defaultMat = { name: '', source: '', maxDensity: 0, densityMethod: 'proctor' as const, optimalMoisture: 0, compactionReq: 95 };
```

**Step 2: Commit**

```bash
git add src/components/compaction/CompactionHeaderForm.tsx
git commit -m "feat: add CompactionHeaderForm component"
```

---

## Task 6: CompactionTestTable component

**Files:**
- Create: `src/components/compaction/CompactionTestTable.tsx`

This component manages an in-memory array of test rows. Parent passes `rows` and `onRowsChange`.

```typescript
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface CompactionRowDraft {
  localisation: string;
  testDate: string;         // 'YYYY-MM-DD'
  materialRef: string;      // 'mat1' | 'mat2'
  requiredPercent: string;
  waterContent: string;
  dryDensity: string;
  retained5mm: string;
  correctedDensity: string;
  compactionPercent: string;
  isCompliant: boolean | null;
  sampleTaken: boolean | null;
  sampleNo: string;
  remarks: string;
}

const emptyRow = (): CompactionRowDraft => ({
  localisation: '', testDate: '', materialRef: 'mat1',
  requiredPercent: '', waterContent: '', dryDensity: '',
  retained5mm: '', correctedDensity: '', compactionPercent: '',
  isCompliant: null, sampleTaken: null, sampleNo: '', remarks: '',
});

interface CompactionTestTableProps {
  rows: CompactionRowDraft[];
  onRowsChange: (rows: CompactionRowDraft[]) => void;
  material1Name?: string;
  material2Name?: string;
}

export function CompactionTestTable({
  rows, onRowsChange, material1Name = 'Mat. 1', material2Name = 'Mat. 2',
}: CompactionTestTableProps) {
  const addRow = () => onRowsChange([...rows, emptyRow()]);
  const removeRow = (i: number) => onRowsChange(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<CompactionRowDraft>) =>
    onRowsChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1 text-left">Localisation</th>
              <th className="px-2 py-1 text-left">Date</th>
              <th className="px-2 py-1 text-left">Matériau</th>
              <th className="px-2 py-1 text-right">% exigé</th>
              <th className="px-2 py-1 text-right">w (%)</th>
              <th className="px-2 py-1 text-right">ρd (kg/m³)</th>
              <th className="px-2 py-1 text-right">R5mm (%)</th>
              <th className="px-2 py-1 text-right">ρd corr.</th>
              <th className="px-2 py-1 text-right">% comp.</th>
              <th className="px-2 py-1 text-center">C/NC</th>
              <th className="px-2 py-1 text-center">Prél.</th>
              <th className="px-2 py-1 text-left">No Éch.</th>
              <th className="px-2 py-1 text-left">Remarques</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-1 py-0.5">
                  <Input className="h-7 text-xs w-24" value={row.localisation} onChange={e => updateRow(i, { localisation: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="date" className="h-7 text-xs w-28" value={row.testDate} onChange={e => updateRow(i, { testDate: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Select value={row.materialRef} onValueChange={v => updateRow(i, { materialRef: v })}>
                    <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mat1">{material1Name}</SelectItem>
                      <SelectItem value="mat2">{material2Name}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" className="h-7 text-xs w-14 text-right" value={row.requiredPercent} onChange={e => updateRow(i, { requiredPercent: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" step="0.1" className="h-7 text-xs w-14 text-right" value={row.waterContent} onChange={e => updateRow(i, { waterContent: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" className="h-7 text-xs w-16 text-right" value={row.dryDensity} onChange={e => updateRow(i, { dryDensity: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" step="0.1" className="h-7 text-xs w-14 text-right" value={row.retained5mm} onChange={e => updateRow(i, { retained5mm: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" className="h-7 text-xs w-16 text-right" value={row.correctedDensity} onChange={e => updateRow(i, { correctedDensity: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input type="number" step="0.1" className="h-7 text-xs w-14 text-right" value={row.compactionPercent} onChange={e => updateRow(i, { compactionPercent: e.target.value })} />
                </td>
                <td className="px-1 py-0.5 text-center">
                  <Select value={row.isCompliant === null ? '' : row.isCompliant ? 'C' : 'NC'} onValueChange={v => updateRow(i, { isCompliant: v === 'C' ? true : v === 'NC' ? false : null })}>
                    <SelectTrigger className="h-7 text-xs w-14"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="NC">NC</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-0.5 text-center">
                  <Select value={row.sampleTaken === null ? '' : row.sampleTaken ? 'O' : 'N'} onValueChange={v => updateRow(i, { sampleTaken: v === 'O' ? true : v === 'N' ? false : null })}>
                    <SelectTrigger className="h-7 text-xs w-12"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="O">O</SelectItem>
                      <SelectItem value="N">N</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-0.5">
                  <Input className="h-7 text-xs w-16" value={row.sampleNo} onChange={e => updateRow(i, { sampleNo: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Input className="h-7 text-xs w-28" value={row.remarks} onChange={e => updateRow(i, { remarks: e.target.value })} />
                </td>
                <td className="px-1 py-0.5">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1" /> Ajouter un essai
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/compaction/CompactionTestTable.tsx
git commit -m "feat: add CompactionTestTable interactive component"
```

---

## Task 7: Integrate into ReportForm

**Files:**
- Modify: `src/app/(app)/reports/create/components/ReportForm.tsx`
- Modify: `src/services/reportService.ts`

### 7a: Update reportService.ts

Add 'compaction' to `VALID_MATERIAL_TYPES` constant (line ~15):

```typescript
const VALID_MATERIAL_TYPES = ['cement', 'asphalt', 'gravel', 'sand', 'other', 'compaction'] as const;
```

### 7b: Update ReportForm.tsx

**Step 1: Update schema + imports**

Change `reportFormSchema` materialType:
```typescript
materialType: z.enum(['cement', 'asphalt', 'gravel', 'sand', 'other', 'compaction'], {
  required_error: 'Le type de matériau est requis.',
}),
```

Add import at top:
```typescript
import { CompactionHeaderForm } from '@/components/compaction/CompactionHeaderForm';
import { CompactionTestTable, type CompactionRowDraft } from '@/components/compaction/CompactionTestTable';
import type { CompactionReportData } from '@/db/schema';
```

**Step 2: Add compaction state** (after `const [testData, ...]` line ~131):

```typescript
const [compactionHeader, setCompactionHeader] = useState<Partial<CompactionReportData>>({});
const [compactionRows, setCompactionRows] = useState<CompactionRowDraft[]>([]);
const isCompaction = form.watch('materialType') === 'compaction';
```

**Step 3: Add 'Contrôle de compacité' to materialTypeOptions** (after 'other'):

```typescript
{ value: 'compaction', label: 'Contrôle de compacité' },
```

**Step 4: After `onSubmitReport` resolves with `reportId`, save compaction rows**

In the submit handler (look for the `try` block where `onSubmitReport` is called), after a successful submit:

```typescript
// After: const result = await onSubmitReport(payload, status, photoFile);
if (result.success && result.reportId && isCompaction && compactionRows.length > 0) {
  await fetch('/api/compaction-rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId: result.reportId, rows: compactionRows }),
  });
}
```

**Step 5: In the form JSX, wrap generic fields in a conditional**

Find the block that renders the "Informations matériau" card (temperature, volume, density, humidity, batchNumber, supplier, samplingMethod fields). Wrap it:

```typescript
{!isCompaction && (
  // existing generic fields card...
)}
{isCompaction && (
  <div className="space-y-4">
    <CompactionHeaderForm
      value={compactionHeader}
      onChange={setCompactionHeader}
    />
    <CompactionTestTable
      rows={compactionRows}
      onRowsChange={setCompactionRows}
      material1Name={compactionHeader.material1?.name || 'Mat. 1'}
      material2Name={compactionHeader.material2?.name || 'Mat. 2'}
    />
  </div>
)}
```

**Step 6: When materialType === 'compaction', pass dummy values for required generic fields**

In the submit handler before calling `onSubmitReport`, detect compaction and set dummy values:

```typescript
if (isCompaction) {
  // Required DB fields — use neutral defaults for compaction reports
  payload.temperature = 0;
  payload.volume = 0;
  payload.density = 0;
  payload.humidity = 0;
  payload.batchNumber = 'N/A';
  payload.supplier = 'N/A';
  payload.samplingMethod = 'other';
  payload.testData = compactionHeader;
}
```

**Step 7: Commit**

```bash
git add src/app/(app)/reports/create/components/ReportForm.tsx src/services/reportService.ts
git commit -m "feat: integrate compaction UI into ReportForm"
```

---

## Task 8: RC-6306 PDF — CompactionDailyReportPDF.tsx

**Files:**
- Create: `src/components/pdf/CompactionDailyReportPDF.tsx`

This PDF mirrors the RC-6306 Excel form layout. It receives:
- The `FieldReport` (with `testData` as `CompactionReportData` header)
- The `CompactionTestRow[]` array (fetched separately)
- Project/technician metadata

Key sections:
1. Header (LER logo, client, project, date, entrepreneur, hours)
2. Materials section (Mat 1 & Mat 2 with Proctor/Planche, density, moisture, requirement)
3. Work type checkboxes (Route: coussin/enrobage/infrastructure/chainages — Bâtiment: semelles/dalles/murs/stationnement)
4. Test results table (Type, % exigé, C/NC, Prél., No Éch./Remarques)
5. Signature line (Effectué par + Vérifié L.E.R)

```typescript
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer';
import type { FieldReport } from '@/lib/types';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

// ─── Styles ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#555' },
  logo: { width: 80, height: 30, objectFit: 'contain' },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', backgroundColor: '#e5e7eb', padding: '2 4', marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 120, color: '#555' },
  value: { flex: 1, borderBottomWidth: 0.5, borderColor: '#ccc' },
  table: { borderWidth: 0.5, borderColor: '#888' },
  th: { backgroundColor: '#e5e7eb', fontWeight: 'bold', padding: '2 4', borderRightWidth: 0.5, borderColor: '#888' },
  td: { padding: '2 4', borderRightWidth: 0.5, borderColor: '#ccc' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc' },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  sigBox: { width: '45%', borderTopWidth: 0.5, borderColor: '#888', paddingTop: 4 },
  compliant: { color: '#16a34a' },
  nonCompliant: { color: '#dc2626' },
});

interface Props {
  report: FieldReport;
  rows: CompactionTestRow[];
  projectName?: string;
  projectLocation?: string;
  technicianName?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
}

export function CompactionDailyReportPDF({
  report, rows, projectName, projectLocation, technicianName, orgLogoUrl, orgName,
}: Props) {
  const header = (report.testData ?? {}) as Partial<CompactionReportData>;
  const reportDate = new Date(report.createdAt).toLocaleDateString('fr-CA');

  return (
    <Document>
      <Page size="A4" style={S.page} orientation="landscape">
        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {orgLogoUrl && <Image src={orgLogoUrl} style={S.logo} />}
            <Text style={S.subtitle}>{orgName}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={S.title}>Rapport journalier — Contrôle de compacité</Text>
            <Text style={S.subtitle}>RC-6306</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.subtitle}>Date : {reportDate}</Text>
            <Text style={S.subtitle}>Arrivée : {header.arrivalTime ?? '–'}  Départ : {header.departureTime ?? '–'}</Text>
            {header.nucleoNo && <Text style={S.subtitle}>Nucléodensimètre : {header.nucleoNo}</Text>}
          </View>
        </View>

        {/* Project info */}
        <View style={S.section}>
          <View style={S.row}><Text style={S.label}>Client :</Text><Text style={S.value}>{orgName}</Text></View>
          <View style={S.row}><Text style={S.label}>Projet :</Text><Text style={S.value}>{projectName}</Text></View>
          <View style={S.row}><Text style={S.label}>Localisation :</Text><Text style={S.value}>{projectLocation}</Text></View>
          <View style={S.row}><Text style={S.label}>Entrepreneur :</Text><Text style={S.value}>{header.entrepreneur ?? '–'}</Text></View>
          <View style={S.row}><Text style={S.label}>Sous-traitant :</Text><Text style={S.value}>{header.subcontractor ?? '–'}</Text></View>
        </View>

        {/* Materials */}
        {[header.material1, header.material2].filter(Boolean).map((mat, i) => mat && (
          <View key={i} style={S.section}>
            <Text style={S.sectionTitle}>Matériau {i + 1} : {mat.name}</Text>
            <View style={S.row}>
              <Text style={S.label}>Provenance :</Text><Text style={S.value}>{mat.source}</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>Méthode :</Text><Text style={S.value}>{mat.densityMethod === 'proctor' ? 'Proctor' : 'Planche'}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Masse vol. max :</Text><Text style={S.value}>{mat.maxDensity} kg/m³</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>w opt :</Text><Text style={S.value}>{mat.optimalMoisture}%</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>Exigence :</Text><Text style={S.value}>{mat.compactionReq}%</Text>
            </View>
          </View>
        ))}

        {/* Work type */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Type de travaux</Text>
          <View style={S.row}>
            <Text style={S.label}>Type :</Text><Text style={S.value}>{header.workType}</Text>
            <Text style={[S.label, { marginLeft: 8 }]}>Catégorie :</Text><Text style={S.value}>{header.workCategory}</Text>
          </View>
          {(header.chainageFrom || header.chainageTo) && (
            <View style={S.row}>
              <Text style={S.label}>Chaîn. de :</Text><Text style={S.value}>{header.chainageFrom}</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>à :</Text><Text style={S.value}>{header.chainageTo}</Text>
            </View>
          )}
        </View>

        {/* Test results table */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Résultats des essais</Text>
          <View style={S.table}>
            <View style={S.tableRow}>
              <Text style={[S.th, { flex: 1 }]}>Localisation</Text>
              <Text style={[S.th, { width: 50 }]}>Matériau</Text>
              <Text style={[S.th, { width: 40 }]}>% exigé</Text>
              <Text style={[S.th, { width: 30 }]}>C/NC</Text>
              <Text style={[S.th, { width: 35 }]}>Prél.</Text>
              <Text style={[S.th, { flex: 1 }]}>No Éch. / Remarques</Text>
            </View>
            {rows.map((row, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={[S.td, { flex: 1 }]}>{row.localisation ?? ''}</Text>
                <Text style={[S.td, { width: 50 }]}>{row.materialRef === 'mat1' ? (header.material1?.name ?? 'Mat.1') : (header.material2?.name ?? 'Mat.2')}</Text>
                <Text style={[S.td, { width: 40 }]}>{row.requiredPercent ?? ''}%</Text>
                <Text style={[S.td, { width: 30 }, row.isCompliant ? S.compliant : S.nonCompliant]}>
                  {row.isCompliant === null ? '–' : row.isCompliant ? 'C' : 'NC'}
                </Text>
                <Text style={[S.td, { width: 35 }]}>{row.sampleTaken === null ? '–' : row.sampleTaken ? 'O' : 'N'}</Text>
                <Text style={[S.td, { flex: 1 }]}>{[row.sampleNo, row.remarks].filter(Boolean).join(' | ')}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signatures */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>Effectué par : {technicianName ?? '–'}</Text>
          </View>
          <View style={S.sigBox}>
            <Text>Vérifié L.E.R : _______________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/pdf/CompactionDailyReportPDF.tsx
git commit -m "feat: add RC-6306 CompactionDailyReportPDF component"
```

---

## Task 9: RC-6304 PDF — CompactionSummaryReportPDF.tsx

**Files:**
- Create: `src/components/pdf/CompactionSummaryReportPDF.tsx`

This PDF is the client summary — aggregates all field test rows for a project, with quantitative data.

Key differences from RC-6306:
- One PDF per **project** (not per report)
- Shows the quantitative columns (moisture, dry density, retained 5mm, corrected density, compaction%)
- Includes a lab tests section (from material1/material2 data of the first report)
- Shows Nucléodensimètre No

```typescript
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

const S = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica', color: '#111' },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#555' },
  logo: { width: 80, height: 30, objectFit: 'contain' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', backgroundColor: '#e5e7eb', padding: '2 4', marginBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 130, color: '#555' },
  value: { flex: 1, borderBottomWidth: 0.5, borderColor: '#ccc' },
  table: { borderWidth: 0.5, borderColor: '#888' },
  th: { backgroundColor: '#e5e7eb', fontWeight: 'bold', padding: '2 3', borderRightWidth: 0.5, borderColor: '#888', fontSize: 7 },
  td: { padding: '2 3', borderRightWidth: 0.5, borderColor: '#ccc', fontSize: 7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#ccc' },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  sigBox: { width: '45%', borderTopWidth: 0.5, borderColor: '#888', paddingTop: 4 },
  compliant: { color: '#16a34a' },
  nonCompliant: { color: '#dc2626' },
});

interface Props {
  rows: CompactionTestRow[];
  /** testData from the first compaction report of the project */
  header: Partial<CompactionReportData>;
  projectName?: string;
  projectLocation?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  entrepreneur?: string;
}

export function CompactionSummaryReportPDF({
  rows, header, projectName, projectLocation, orgLogoUrl, orgName, entrepreneur,
}: Props) {
  const today = new Date().toLocaleDateString('fr-CA');

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* Header */}
        <View style={S.headerRow}>
          <View>
            {orgLogoUrl && <Image src={orgLogoUrl} style={S.logo} />}
            <Text style={S.subtitle}>{orgName}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={S.title}>Résumé d'essais — Contrôle de compacité</Text>
            <Text style={S.subtitle}>RC-6304</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.subtitle}>Date : {today}</Text>
            {header.nucleoNo && <Text style={S.subtitle}>Nucléodensimètre No : {header.nucleoNo}</Text>}
          </View>
        </View>

        {/* Project info */}
        <View style={S.section}>
          <View style={S.row}><Text style={S.label}>Client :</Text><Text style={S.value}>{orgName}</Text></View>
          <View style={S.row}><Text style={S.label}>Projet :</Text><Text style={S.value}>{projectName}</Text></View>
          <View style={S.row}><Text style={S.label}>Localisation :</Text><Text style={S.value}>{projectLocation}</Text></View>
          <View style={S.row}><Text style={S.label}>Entrepreneur :</Text><Text style={S.value}>{entrepreneur ?? header.entrepreneur ?? '–'}</Text></View>
        </View>

        {/* Lab tests section (material specs) */}
        {[header.material1, header.material2].filter(Boolean).map((mat, i) => mat && (
          <View key={i} style={S.section}>
            <Text style={S.sectionTitle}>Essais de laboratoire — Matériau {i + 1} : {mat.name}</Text>
            <View style={S.row}>
              <Text style={S.label}>Provenance :</Text><Text style={S.value}>{mat.source}</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>Usage :</Text><Text style={S.value}>{header.workCategory ?? '–'}</Text>
            </View>
            <View style={S.row}>
              <Text style={S.label}>Masse vol. sèche max :</Text><Text style={S.value}>{mat.maxDensity} kg/m³ ({mat.densityMethod === 'proctor' ? 'Proctor' : 'Planche'})</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>Humidité optimum :</Text><Text style={S.value}>{mat.optimalMoisture}%</Text>
              <Text style={[S.label, { marginLeft: 8 }]}>Compacité exigée :</Text><Text style={S.value}>{mat.compactionReq}%</Text>
            </View>
          </View>
        ))}

        {/* Field tests table */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Essais de terrain</Text>
          <View style={S.table}>
            <View style={S.tableRow}>
              <Text style={[S.th, { flex: 2 }]}>Localisation</Text>
              <Text style={[S.th, { width: 52 }]}>Date</Text>
              <Text style={[S.th, { width: 38 }]}>Teneur eau (%)</Text>
              <Text style={[S.th, { width: 50 }]}>Masse vol. sèche (kg/m³)</Text>
              <Text style={[S.th, { width: 38 }]}>Retenu 5mm (%)</Text>
              <Text style={[S.th, { width: 50 }]}>Masse vol. corrigée (kg/m³)</Text>
              <Text style={[S.th, { width: 40 }]}>% compacité</Text>
              <Text style={[S.th, { flex: 1 }]}>Remarques</Text>
            </View>
            {rows.map((row, i) => {
              const pct = row.compactionPercent ? Number(row.compactionPercent) : null;
              const req = row.requiredPercent ? Number(row.requiredPercent) : null;
              const ok = pct !== null && req !== null ? pct >= req : null;
              return (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.td, { flex: 2 }]}>{row.localisation ?? ''}</Text>
                  <Text style={[S.td, { width: 52 }]}>{row.testDate ?? ''}</Text>
                  <Text style={[S.td, { width: 38 }]}>{row.waterContent ?? ''}</Text>
                  <Text style={[S.td, { width: 50 }]}>{row.dryDensity ?? ''}</Text>
                  <Text style={[S.td, { width: 38 }]}>{row.retained5mm ?? ''}</Text>
                  <Text style={[S.td, { width: 50 }]}>{row.correctedDensity ?? ''}</Text>
                  <Text style={[S.td, { width: 40 }, ok === true ? S.compliant : ok === false ? S.nonCompliant : {}]}>
                    {row.compactionPercent ?? ''}
                  </Text>
                  <Text style={[S.td, { flex: 1 }]}>{row.remarks ?? ''}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Signatures */}
        <View style={S.sigRow}>
          <View style={S.sigBox}><Text>Effectué par : _______________</Text><Text style={{ marginTop: 2, fontSize: 7 }}>Initiales + Date</Text></View>
          <View style={S.sigBox}><Text>Vérifié L.E.R : _______________</Text><Text style={{ marginTop: 2, fontSize: 7 }}>Initiales + Date</Text></View>
        </View>
      </Page>
    </Document>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/pdf/CompactionSummaryReportPDF.tsx
git commit -m "feat: add RC-6304 CompactionSummaryReportPDF component"
```

---

## Task 10: Wire PDFs — Download buttons

### 10a: RC-6306 daily report button

**Files:**
- Modify: `src/components/pdf/DownloadReportButton.tsx`

Add a branch: if `report.materialType === 'compaction'`, fetch the rows then render `CompactionDailyReportPDF` instead of `ReportPDFDocument`.

Add state for rows:

```typescript
const [compactionRows, setCompactionRows] = useState<CompactionTestRow[]>([]);
const [rowsLoaded, setRowsLoaded] = useState(false);

useEffect(() => {
  if (!isClient || report.materialType !== 'compaction') return;
  fetch(`/api/compaction-rows?reportId=${report.id}`)
    .then(r => r.json())
    .then(data => { setCompactionRows(data); setRowsLoaded(true); })
    .catch(() => setRowsLoaded(true));
}, [isClient, report.id, report.materialType]);
```

Then in the JSX return, if `report.materialType === 'compaction'`:

```typescript
if (report.materialType === 'compaction') {
  if (!rowsLoaded) return <Button variant={variant} size={size} className={className} disabled><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Chargement...</Button>;
  return (
    <PDFDownloadLink
      document={
        <CompactionDailyReportPDF
          report={report}
          rows={compactionRows}
          projectName={projectName}
          projectLocation={projectLocation}
          technicianName={technicianName}
          orgLogoUrl={orgLogoUrl}
          orgName={orgName}
        />
      }
      fileName={`RC-6306-${report.id.slice(0, 8).toUpperCase()}.pdf`}
    >
      {({ loading }) => (
        <Button variant={variant} size={size} className={className} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...</> : <><Download className="h-4 w-4 mr-1.5" /> RC-6306</>}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
```

Add import at top:
```typescript
import { CompactionDailyReportPDF } from './CompactionDailyReportPDF';
import type { CompactionTestRow } from '@/db/schema';
```

### 10b: RC-6304 summary button on project page

**Files:**
- Create: `src/components/pdf/DownloadCompactionSummaryButton.tsx`

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CompactionSummaryReportPDF } from './CompactionSummaryReportPDF';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

interface DownloadCompactionSummaryButtonProps {
  projectId: string;
  projectName?: string;
  projectLocation?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  /** testData from first compaction report (contains material specs) */
  compactionHeader?: Partial<CompactionReportData>;
}

export function DownloadCompactionSummaryButton({
  projectId, projectName, projectLocation, orgLogoUrl, orgName, compactionHeader = {},
}: DownloadCompactionSummaryButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [rows, setRows] = useState<CompactionTestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient) return;
    fetch(`/api/compaction-rows?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isClient, projectId]);

  if (!isClient || loading) {
    return <Button variant="outline" size="sm" disabled><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> RC-6304</Button>;
  }

  return (
    <PDFDownloadLink
      document={
        <CompactionSummaryReportPDF
          rows={rows}
          header={compactionHeader}
          projectName={projectName}
          projectLocation={projectLocation}
          orgLogoUrl={orgLogoUrl}
          orgName={orgName}
        />
      }
      fileName={`RC-6304-${projectId.slice(0, 8).toUpperCase()}.pdf`}
    >
      {({ loading: gen }) => (
        <Button variant="outline" size="sm" disabled={gen}>
          {gen ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...</> : <><Download className="h-4 w-4 mr-1.5" /> RC-6304</>}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
```

**Note:** The `GET /api/compaction-rows?projectId=` endpoint needs to be added to the API route (Task 4). In `route.ts`, add a `projectId` branch in the GET handler:

```typescript
if (projectId) {
  if (!isUUID(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  // Verify IDOR via org
  const rows = await db
    .select()
    .from(compactionTestRows)
    .where(and(
      eq(compactionTestRows.projectId, projectId),
      eq(compactionTestRows.organizationId, dbUser.organizationId)
    ));
  return NextResponse.json(rows);
}
```

Also add `DownloadCompactionSummaryButton` to the project detail page where compaction reports are listed. Find the project detail page and add the button in the report actions area.

**Step 2: Commit**

```bash
git add src/components/pdf/DownloadReportButton.tsx src/components/pdf/DownloadCompactionSummaryButton.tsx src/app/api/compaction-rows/route.ts
git commit -m "feat: wire RC-6306 and RC-6304 PDF download buttons"
```

---

## Task 11: Add DownloadCompactionSummaryButton to project page

**Files:**
- Read: `src/app/(app)/projects/[id]/page.tsx` (or similar) to find where to place the button

Find the project detail page and locate where reports are listed or where the project header is rendered. Add the `DownloadCompactionSummaryButton` there, conditionally — only show it if the project has compaction reports.

To check if the project has compaction reports, pass `hasCompaction` as a prop or check if any report has `materialType === 'compaction'` in the existing report list.

Example addition in the project page JSX:

```typescript
import { DownloadCompactionSummaryButton } from '@/components/pdf/DownloadCompactionSummaryButton';

// In the JSX, near other project action buttons:
{hasCompactionReports && (
  <DownloadCompactionSummaryButton
    projectId={project.id}
    projectName={project.name}
    projectLocation={project.location}
    orgLogoUrl={orgLogoUrl}
    orgName={orgName}
    compactionHeader={firstCompactionReport?.testData as Partial<CompactionReportData>}
  />
)}
```

**Step 2: Commit**

```bash
git add src/app/(app)/projects/[id]/page.tsx
git commit -m "feat: add RC-6304 download button on project page"
```

---

## Testing Checklist

After all tasks are done, manually test:

1. **Create compaction report:**
   - Select "Contrôle de compacité" as material type
   - Verify generic fields (temperature, volume, etc.) are hidden
   - Fill in header fields (arrival time, material 1, work type)
   - Add 3–4 test rows with various C/NC values
   - Save as DRAFT → verify report appears in list
   - Submit → verify compaction rows saved (check DB or `/api/compaction-rows?reportId=xxx`)

2. **RC-6306 PDF:**
   - Open report detail page
   - Click "RC-6306" download button
   - Verify PDF shows header info, materials, work type, test results table
   - Verify C rows are green, NC rows are red

3. **RC-6304 PDF:**
   - Open project page
   - Verify "RC-6304" button appears (only if project has compaction reports)
   - Download PDF → verify all test rows from all reports appear
   - Verify material specs section matches material1/material2 from first report

4. **Security:**
   - Verify RLS prevents cross-org access (test with two different org accounts)

---

## Summary of files changed

| File | Action |
|------|--------|
| `supabase/migrations/20260429000001_compaction.sql` | Create |
| `src/db/schema.ts` | Modify — add enum value + table + types |
| `src/services/compactionService.ts` | Create |
| `src/app/api/compaction-rows/route.ts` | Create |
| `src/middleware.ts` | Modify — add route to rate limit |
| `src/components/compaction/CompactionHeaderForm.tsx` | Create |
| `src/components/compaction/CompactionTestTable.tsx` | Create |
| `src/app/(app)/reports/create/components/ReportForm.tsx` | Modify |
| `src/services/reportService.ts` | Modify — add 'compaction' to valid types |
| `src/components/pdf/CompactionDailyReportPDF.tsx` | Create |
| `src/components/pdf/CompactionSummaryReportPDF.tsx` | Create |
| `src/components/pdf/DownloadReportButton.tsx` | Modify |
| `src/components/pdf/DownloadCompactionSummaryButton.tsx` | Create |
| `src/app/(app)/projects/[id]/page.tsx` | Modify |
