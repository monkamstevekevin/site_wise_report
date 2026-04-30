# LER Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter 4 fonctionnalités demandées par LER — suivi des heures, projets par visites ou heures, alertes intelligentes admin, et tableau de bord techniciens.

**Architecture:** Nouvelles colonnes sur `projects` pour le type (VISITS/HOURS) et les cibles, nouvelle table `time_entries` pour le suivi des heures, extension des types de notifications, nouveau cron `/api/cron/smart-alerts`, et nouvelles pages admin.

**Tech Stack:** Next.js 15, Drizzle ORM, Supabase PostgreSQL, TypeScript, shadcn/ui, Vercel Cron

---

## Vue d'ensemble des 4 phases

| Phase | Fonctionnalité | Complexité |
|-------|---------------|------------|
| 1 | Suivi du temps (time entries) | Moyenne |
| 2 | Projets par visites ou heures | Moyenne |
| 3 | Alertes intelligentes admin (cron) | Haute |
| 4 | Tableau de bord techniciens | Moyenne |

---

## Phase 1 — Suivi du temps (Time Tracking)

### Task 1: Migration DB — table `time_entries`

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0003_time_entries.sql`

**Step 1: Ajouter la table dans schema.ts**

Ajouter après la table `reportAttachments` :

```typescript
/**
 * time_entries — suivi du temps par technicien et par projet
 */
export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id')
      .references(() => reports.id, { onDelete: 'set null' }),
    date: timestamp('date', { withTimezone: true }).notNull(),
    durationMinutes: numeric('duration_minutes', { precision: 8, scale: 2 }).notNull(),
    notes: text('notes'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('te_user_id_idx').on(table.userId),
    index('te_project_id_idx').on(table.projectId),
    index('te_date_idx').on(table.date),
    index('te_org_id_idx').on(table.organizationId),
  ]
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
```

**Step 2: Créer le fichier SQL de migration**

Créer `src/db/migrations/0003_time_entries.sql` :

```sql
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "report_id" uuid REFERENCES "reports"("id") ON DELETE SET NULL,
  "date" timestamptz NOT NULL,
  "duration_minutes" numeric(8,2) NOT NULL,
  "notes" text,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "te_user_id_idx" ON "time_entries"("user_id");
CREATE INDEX IF NOT EXISTS "te_project_id_idx" ON "time_entries"("project_id");
CREATE INDEX IF NOT EXISTS "te_date_idx" ON "time_entries"("date");
CREATE INDEX IF NOT EXISTS "te_org_id_idx" ON "time_entries"("organization_id");
```

**Step 3: Exécuter la migration dans Supabase SQL Editor**

Copier/coller le contenu du fichier SQL dans Supabase → SQL Editor → Run.

**Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations/0003_time_entries.sql
git commit -m "feat: add time_entries table for time tracking"
```

---

### Task 2: Service — timeEntryService.ts

**Files:**
- Create: `src/services/timeEntryService.ts`

**Step 1: Créer le service**

```typescript
// src/services/timeEntryService.ts
import { db } from '@/db';
import { timeEntries, users } from '@/db/schema';
import { eq, and, gte, lte, sum, desc } from 'drizzle-orm';

export async function createTimeEntry(data: {
  userId: string;
  projectId: string;
  reportId?: string;
  date: Date;
  durationMinutes: number;
  notes?: string;
  organizationId: string;
}) {
  const [entry] = await db.insert(timeEntries).values(data).returning();
  return entry;
}

export async function getTimeEntriesByProject(projectId: string, orgId: string) {
  return db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      userName: users.name,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      notes: timeEntries.notes,
      reportId: timeEntries.reportId,
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(and(eq(timeEntries.projectId, projectId), eq(timeEntries.organizationId, orgId)))
    .orderBy(desc(timeEntries.date));
}

export async function getTotalHoursByUser(userId: string, orgId: string, from?: Date, to?: Date) {
  const conditions = [eq(timeEntries.userId, userId), eq(timeEntries.organizationId, orgId)];
  if (from) conditions.push(gte(timeEntries.date, from));
  if (to) conditions.push(lte(timeEntries.date, to));

  const result = await db
    .select({ total: sum(timeEntries.durationMinutes) })
    .from(timeEntries)
    .where(and(...conditions));

  const totalMinutes = Number(result[0]?.total ?? 0);
  return Math.round(totalMinutes / 60 * 10) / 10; // retourne des heures avec 1 décimale
}

export async function getHoursByUserPerProject(orgId: string) {
  return db
    .select({
      userId: timeEntries.userId,
      userName: users.name,
      projectId: timeEntries.projectId,
      totalMinutes: sum(timeEntries.durationMinutes),
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(eq(timeEntries.organizationId, orgId))
    .groupBy(timeEntries.userId, users.name, timeEntries.projectId);
}
```

**Step 2: Commit**

```bash
git add src/services/timeEntryService.ts
git commit -m "feat: add time entry service"
```

---

### Task 3: API Route — time entries CRUD

**Files:**
- Create: `src/app/api/time-entries/route.ts`

```typescript
// src/app/api/time-entries/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createTimeEntry, getTimeEntriesByProject } from '@/services/timeEntryService';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const body = await request.json();
  const entry = await createTimeEntry({
    userId: user.id,
    projectId: body.projectId,
    reportId: body.reportId,
    date: new Date(body.date),
    durationMinutes: body.durationMinutes,
    notes: body.notes,
    organizationId: dbUser.organizationId,
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!dbUser?.organizationId) return NextResponse.json({ error: 'No org' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const entries = await getTimeEntriesByProject(projectId, dbUser.organizationId);
  return NextResponse.json(entries);
}
```

**Step 2: Commit**

```bash
git add src/app/api/time-entries/route.ts
git commit -m "feat: add time entries API route"
```

---

### Task 4: UI — Formulaire de saisie de temps dans la page rapport

**Files:**
- Modify: `src/app/(app)/reports/view/[reportId]/page.tsx`
- Create: `src/app/(app)/reports/view/[reportId]/components/TimeEntryForm.tsx`

**Step 1: Créer le composant TimeEntryForm**

```tsx
// src/app/(app)/reports/view/[reportId]/components/TimeEntryForm.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

interface Props {
  projectId: string;
  reportId: string;
  onSaved?: () => void;
}

export function TimeEntryForm({ projectId, reportId, onSaved }: Props) {
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        reportId,
        date: new Date().toISOString(),
        durationMinutes: Math.round(parseFloat(hours) * 60),
        notes,
      }),
    });
    setSaving(false);
    setHours('');
    setNotes('');
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="h-4 w-4" />
        Enregistrer le temps passé
      </div>
      <div className="flex gap-3">
        <div className="w-32">
          <Label htmlFor="hours" className="text-xs">Heures</Label>
          <Input
            id="hours"
            type="number"
            min="0.25"
            step="0.25"
            placeholder="ex: 2.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="te-notes" className="text-xs">Notes (optionnel)</Label>
          <Input
            id="te-notes"
            placeholder="ex: Échantillonnage + déplacement"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={saving || !hours}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  );
}
```

**Step 2: Intégrer dans la page rapport**

Ajouter `<TimeEntryForm projectId={report.projectId} reportId={report.id} />` dans la vue d'un rapport, visible pour les techniciens.

**Step 3: Commit**

```bash
git add src/app/\(app\)/reports/view/
git commit -m "feat: add time entry form in report view"
```

---

## Phase 2 — Projets par visites ou heures

### Task 5: Migration DB — colonnes sur `projects`

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0004_project_targets.sql`

**Step 1: Ajouter l'enum et colonnes dans schema.ts**

```typescript
// Ajouter dans les enums :
export const projectTypeEnum = pgEnum('project_type', ['VISITS', 'HOURS', 'OPEN']);

// Modifier la table projects — ajouter ces colonnes :
projectType: projectTypeEnum('project_type').notNull().default('OPEN'),
targetVisits: numeric('target_visits', { precision: 6, scale: 0 }),   // nombre de rapports attendus
targetHours: numeric('target_hours', { precision: 8, scale: 2 }),      // nombre d'heures attendues
```

**Step 2: SQL de migration**

```sql
-- src/db/migrations/0004_project_targets.sql
CREATE TYPE IF NOT EXISTS "project_type" AS ENUM ('VISITS', 'HOURS', 'OPEN');

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "project_type" project_type NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "target_visits" numeric(6,0),
  ADD COLUMN IF NOT EXISTS "target_hours" numeric(8,2);
```

**Step 3: Exécuter dans Supabase SQL Editor**

**Step 4: Commit**

```bash
git add src/db/schema.ts src/db/migrations/0004_project_targets.sql
git commit -m "feat: add project type and targets (visits/hours)"
```

---

### Task 6: UI — Formulaire de projet mis à jour

**Files:**
- Modify: `src/app/(app)/admin/projects/components/` (formulaire création/édition)

**Step 1: Ajouter les champs projectType, targetVisits, targetHours**

Dans le formulaire projet, ajouter un select pour choisir le type :
- **OPEN** — Projet libre (pas de cible)
- **VISITS** — Nombre de visites cible → affiche champ `targetVisits`
- **HOURS** — Nombre d'heures cible → affiche champ `targetHours`

Affichage conditionnel : si `projectType === 'VISITS'`, afficher l'input "Nombre de visites prévues". Si `HOURS`, afficher "Nombre d'heures prévues".

**Step 2: Afficher la progression dans la fiche projet**

Dans la vue projet, afficher une barre de progression :
- VISITS : `X / targetVisits visites` (nombre de rapports VALIDATED)
- HOURS : `X / targetHours heures` (somme des time_entries)

**Step 3: Commit**

```bash
git add src/app/\(app\)/admin/projects/
git commit -m "feat: project type selector and progress bar"
```

---

## Phase 3 — Alertes intelligentes admin

### Task 7: Nouveaux types de notifications dans schema.ts

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Étendre notificationTypeEnum**

```typescript
export const notificationTypeEnum = pgEnum('notification_type', [
  'new_chat_message',
  'report_update',
  'project_assignment',
  'system_update',
  'generic',
  'project_assigned_admin_confirm',
  // Nouveaux types alertes intelligentes :
  'project_overdue',           // projet passé la date de fin sans être COMPLETED
  'project_behind_visits',     // projet en retard sur le nb de visites
  'project_behind_hours',      // projet en retard sur les heures
  'technician_inactive',       // technicien sans rapport depuis X jours sur un projet actif
  'report_pending_too_long',   // rapport SUBMITTED depuis plus de 48h sans révision
]);
```

**Step 2: Migration SQL**

```sql
-- À ajouter dans Supabase SQL Editor (ALTER TYPE pour PostgreSQL)
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_overdue';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_behind_visits';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'project_behind_hours';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'technician_inactive';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'report_pending_too_long';
```

**Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add smart alert notification types"
```

---

### Task 8: Cron route — /api/cron/smart-alerts

**Files:**
- Create: `src/app/api/cron/smart-alerts/route.ts`
- Modify: `vercel.json`

**Step 1: Créer la route cron**

```typescript
// src/app/api/cron/smart-alerts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  projects, reports, users, userAssignments, notifications, timeEntries
} from '@/db/schema';
import { eq, and, lt, lte, gte, inArray, sql, count, sum, ne } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const alerts: string[] = [];

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
    // Trouver les admins de l'org
    const admins = await db.select().from(users).where(
      and(eq(users.organizationId, project.organizationId), eq(users.role, 'ADMIN'))
    );
    for (const admin of admins) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: 'project_overdue',
        message: `Le projet "${project.name}" a dépassé sa date de fin sans être complété.`,
        targetId: project.id,
        link: `/project/${project.id}`,
        organizationId: project.organizationId,
      }).onConflictDoNothing();
    }
    alerts.push(`project_overdue: ${project.name}`);
  }

  // 2. Rapports en attente de révision depuis plus de 48h
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const pendingReports = await db
    .select({
      id: reports.id,
      projectId: reports.projectId,
      organizationId: reports.organizationId,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(and(eq(reports.status, 'SUBMITTED'), lte(reports.createdAt, cutoff48h)));

  for (const report of pendingReports) {
    if (!report.organizationId) continue;
    const admins = await db.select().from(users).where(
      and(eq(users.organizationId, report.organizationId), eq(users.role, 'ADMIN'))
    );
    for (const admin of admins) {
      await db.insert(notifications).values({
        userId: admin.id,
        type: 'report_pending_too_long',
        message: `Un rapport soumis il y a plus de 48h n'a pas encore été révisé.`,
        targetId: report.id,
        link: `/reports/view/${report.id}`,
        organizationId: report.organizationId,
      }).onConflictDoNothing();
    }
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

  for (const assignment of activeAssignments) {
    const recentReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(
        eq(reports.technicianId, assignment.userId),
        eq(reports.projectId, assignment.projectId),
        gte(reports.createdAt, cutoff7days)
      ))
      .limit(1);

    if (recentReports.length === 0 && assignment.organizationId) {
      const [tech] = await db.select().from(users).where(eq(users.id, assignment.userId));
      const admins = await db.select().from(users).where(
        and(eq(users.organizationId, assignment.organizationId), eq(users.role, 'ADMIN'))
      );
      for (const admin of admins) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: 'technician_inactive',
          message: `${tech?.name ?? 'Un technicien'} n'a soumis aucun rapport depuis 7 jours sur un projet actif.`,
          targetId: assignment.userId,
          link: `/admin/users`,
          organizationId: assignment.organizationId,
        }).onConflictDoNothing();
      }
      alerts.push(`technician_inactive: ${tech?.name}`);
    }
  }

  return NextResponse.json({ ok: true, alerts });
}
```

**Step 2: Ajouter au vercel.json**

```json
{
  "crons": [
    { "path": "/api/cron/trial-expiry", "schedule": "0 9 * * *" },
    { "path": "/api/cron/smart-alerts", "schedule": "0 8 * * *" }
  ]
}
```

**Step 3: Commit**

```bash
git add src/app/api/cron/smart-alerts/route.ts vercel.json
git commit -m "feat: smart alerts cron job for admin notifications"
```

---

## Phase 4 — Tableau de bord techniciens (Admin)

### Task 9: Page /admin/technicians

**Files:**
- Create: `src/app/(app)/admin/technicians/page.tsx`
- Modify: `src/app/(app)/admin/layout.tsx` (ajouter lien nav)

**Step 1: Créer la page**

```tsx
// src/app/(app)/admin/technicians/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, reports, timeEntries, userAssignments, projects } from '@/db/schema';
import { eq, and, gte, count, sum } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, FolderOpen } from 'lucide-react';

export default async function TechniciansPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (currentUser?.role !== 'ADMIN') redirect('/dashboard');

  const orgId = currentUser.organizationId!;

  // Récupérer tous les techniciens
  const technicians = await db
    .select()
    .from(users)
    .where(and(eq(users.organizationId, orgId), eq(users.role, 'TECHNICIAN')));

  // Début du mois courant
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Stats par technicien
  const stats = await Promise.all(technicians.map(async (tech) => {
    const [reportCount] = await db
      .select({ count: count() })
      .from(reports)
      .where(and(
        eq(reports.technicianId, tech.id),
        eq(reports.organizationId, orgId),
        gte(reports.createdAt, startOfMonth)
      ));

    const [hoursResult] = await db
      .select({ total: sum(timeEntries.durationMinutes) })
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, tech.id),
        eq(timeEntries.organizationId, orgId),
        gte(timeEntries.date, startOfMonth)
      ));

    const [projectCount] = await db
      .select({ count: count() })
      .from(userAssignments)
      .innerJoin(projects, and(
        eq(userAssignments.projectId, projects.id),
        eq(projects.status, 'ACTIVE')
      ))
      .where(eq(userAssignments.userId, tech.id));

    const totalHours = Math.round(Number(hoursResult?.total ?? 0) / 60 * 10) / 10;

    return {
      ...tech,
      reportsThisMonth: reportCount?.count ?? 0,
      hoursThisMonth: totalHours,
      activeProjects: projectCount?.count ?? 0,
    };
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestion des techniciens</h1>
      <div className="grid gap-4">
        {stats.map((tech) => (
          <div key={tech.id} className="border rounded-xl p-5 bg-white flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{tech.name}</p>
              <p className="text-sm text-gray-500">{tech.email}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 text-blue-600">
                  <FileText className="h-4 w-4" />
                  <span className="text-lg font-bold">{tech.reportsThisMonth}</span>
                </div>
                <span className="text-xs text-gray-400">Rapports ce mois</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 text-green-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-bold">{tech.hoursThisMonth}h</span>
                </div>
                <span className="text-xs text-gray-400">Heures ce mois</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 text-orange-600">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-lg font-bold">{tech.activeProjects}</span>
                </div>
                <span className="text-xs text-gray-400">Projets actifs</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Ajouter le lien dans la navigation admin**

Dans `src/app/(app)/admin/layout.tsx`, ajouter un lien vers `/admin/technicians`.

**Step 3: Commit**

```bash
git add src/app/\(app\)/admin/technicians/ src/app/\(app\)/admin/layout.tsx
git commit -m "feat: admin technicians dashboard with stats"
```

---

## Ordre d'exécution recommandé

```
Phase 1 (Tasks 1-4) → Phase 2 (Tasks 5-6) → Phase 3 (Tasks 7-8) → Phase 4 (Task 9)
```

Les phases 1 et 2 peuvent être faites en parallèle car elles sont indépendantes.
La phase 3 dépend du schéma de phase 1 (time_entries pour les alertes heures).
La phase 4 dépend des phases 1 et 2 pour afficher les stats complètes.

## Tests manuels à faire après chaque phase

- **Phase 1** : Créer une entrée de temps depuis un rapport → vérifier en DB
- **Phase 2** : Créer un projet VISITS avec cible 5 → soumettre 3 rapports → vérifier la barre de progression à 60%
- **Phase 3** : Appeler `/api/cron/smart-alerts` avec le bon `CRON_SECRET` → vérifier les notifications créées
- **Phase 4** : Aller sur `/admin/technicians` → vérifier les stats de chaque technicien

## Variables d'environnement requises

Déjà configurées : `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, etc.
Aucune nouvelle variable requise pour ces fonctionnalités.
