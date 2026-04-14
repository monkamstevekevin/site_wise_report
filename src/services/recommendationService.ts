import { db } from '@/db';
import { projects, reports, users, userAssignments, timeEntries } from '@/db/schema';
import { eq, and, lt, gte, count, sum, ne } from 'drizzle-orm';

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type RecommendationType =
  | 'last_visit_missing'
  | 'project_deadline_soon'
  | 'project_overdue'
  | 'technician_inactive'
  | 'report_rejected_pending'
  | 'unassigned_project';

export interface AdminRecommendation {
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  link: string;
  projectId?: string;
  userId?: string;
}

export async function getAdminRecommendations(orgId: string): Promise<AdminRecommendation[]> {
  const recommendations: AdminRecommendation[] = [];
  const now = new Date();

  // ── 1. Projets actifs ─────────────────────────────────────────────────────
  const activeProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.status, 'ACTIVE')));

  for (const project of activeProjects) {
    const daysUntilEnd = project.endDate
      ? Math.ceil((new Date(project.endDate).getTime() - now.getTime()) / 86400000)
      : null;

    // Projet en retard (endDate dépassée)
    if (project.endDate && new Date(project.endDate) < now) {
      recommendations.push({
        id: `overdue-${project.id}`,
        type: 'project_overdue',
        priority: 'HIGH',
        title: `Projet en retard : ${project.name}`,
        description: `Ce projet a dépassé sa date de fin sans être marqué comme complété.`,
        link: `/project/${project.id}`,
        projectId: project.id,
      });
      continue; // Pas besoin d'autres alertes pour ce projet
    }

    // Projet type VISITS — vérifier les visites manquantes
    if (project.projectType === 'VISITS' && project.targetVisits) {
      const target = Number(project.targetVisits);
      const [validatedCount] = await db
        .select({ c: count() })
        .from(reports)
        .where(and(
          eq(reports.projectId, project.id),
          eq(reports.status, 'VALIDATED')
        ));
      const done = Number(validatedCount?.c ?? 0);
      const remaining = target - done;

      if (remaining === 1) {
        recommendations.push({
          id: `last-visit-${project.id}`,
          type: 'last_visit_missing',
          priority: 'HIGH',
          title: `Dernière visite manquante : ${project.name}`,
          description: `Il manque 1 visite pour atteindre l'objectif de ${target} visites. Le projet peut être clôturé après.`,
          link: `/project/${project.id}`,
          projectId: project.id,
        });
      } else if (remaining > 1 && daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd > 0) {
        recommendations.push({
          id: `deadline-visits-${project.id}`,
          type: 'project_deadline_soon',
          priority: daysUntilEnd <= 3 ? 'HIGH' : 'MEDIUM',
          title: `Délai serré : ${project.name}`,
          description: `${remaining} visites restantes pour une échéance dans ${daysUntilEnd} jour${daysUntilEnd > 1 ? 's' : ''}.`,
          link: `/project/${project.id}`,
          projectId: project.id,
        });
      }
    }

    // Projet type HOURS — vérifier les heures manquantes
    if (project.projectType === 'HOURS' && project.targetHours) {
      const target = Number(project.targetHours);
      const [hoursResult] = await db
        .select({ total: sum(timeEntries.durationMinutes) })
        .from(timeEntries)
        .where(eq(timeEntries.projectId, project.id));
      const loggedHours = Number(hoursResult?.total ?? 0) / 60;
      const remaining = target - loggedHours;

      if (remaining > 0 && daysUntilEnd !== null && daysUntilEnd <= 7 && daysUntilEnd > 0) {
        recommendations.push({
          id: `deadline-hours-${project.id}`,
          type: 'project_deadline_soon',
          priority: daysUntilEnd <= 3 ? 'HIGH' : 'MEDIUM',
          title: `Heures insuffisantes : ${project.name}`,
          description: `${Math.round(remaining * 10) / 10}h restantes à logger avant l'échéance dans ${daysUntilEnd} jour${daysUntilEnd > 1 ? 's' : ''}.`,
          link: `/project/${project.id}`,
          projectId: project.id,
        });
      }
    }

    // Projet sans technicien assigné
    const [assignmentCount] = await db
      .select({ c: count() })
      .from(userAssignments)
      .where(eq(userAssignments.projectId, project.id));
    if (Number(assignmentCount?.c ?? 0) === 0) {
      recommendations.push({
        id: `unassigned-${project.id}`,
        type: 'unassigned_project',
        priority: 'MEDIUM',
        title: `Projet sans équipe : ${project.name}`,
        description: `Aucun technicien n'est assigné à ce projet actif.`,
        link: `/admin/overview`,
        projectId: project.id,
      });
    }
  }

  // ── 2. Techniciens inactifs (7+ jours) ───────────────────────────────────
  const cutoff7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activeAssignments = await db
    .select({
      userId: userAssignments.userId,
      projectId: userAssignments.projectId,
      userName: users.name,
    })
    .from(userAssignments)
    .leftJoin(users, eq(userAssignments.userId, users.id))
    .where(eq(userAssignments.organizationId, orgId));

  // Filtrer uniquement les assignements sur projets actifs
  const activeProjectIds = new Set(activeProjects.map(p => p.id));

  for (const assignment of activeAssignments) {
    if (!activeProjectIds.has(assignment.projectId)) continue;

    const [recent] = await db
      .select({ c: count() })
      .from(reports)
      .where(and(
        eq(reports.technicianId, assignment.userId),
        eq(reports.projectId, assignment.projectId),
        gte(reports.createdAt, cutoff7days)
      ));

    if (Number(recent?.c ?? 0) === 0) {
      const proj = activeProjects.find(p => p.id === assignment.projectId);
      recommendations.push({
        id: `inactive-${assignment.userId}-${assignment.projectId}`,
        type: 'technician_inactive',
        priority: 'MEDIUM',
        title: `Technicien inactif : ${assignment.userName ?? 'Inconnu'}`,
        description: `Aucun rapport soumis depuis 7+ jours sur le projet "${proj?.name ?? assignment.projectId}".`,
        link: `/admin/technicians`,
        userId: assignment.userId,
        projectId: assignment.projectId,
      });
    }
  }

  // ── 3. Rapports rejetés non recorrigés (48h+) ────────────────────────────
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const rejectedReports = await db
    .select({
      id: reports.id,
      projectId: reports.projectId,
      technicianId: reports.technicianId,
      updatedAt: reports.updatedAt,
    })
    .from(reports)
    .where(and(
      eq(reports.organizationId, orgId),
      eq(reports.status, 'REJECTED'),
      lt(reports.updatedAt, cutoff48h)
    ));

  for (const r of rejectedReports) {
    const proj = activeProjects.find(p => p.id === r.projectId);
    recommendations.push({
      id: `rejected-${r.id}`,
      type: 'report_rejected_pending',
      priority: 'HIGH',
      title: `Rapport rejeté non corrigé`,
      description: `Un rapport${proj ? ` sur "${proj.name}"` : ''} a été rejeté il y a plus de 48h sans correction.`,
      link: `/reports/view/${r.id}`,
      projectId: r.projectId,
      userId: r.technicianId,
    });
  }

  // Trier par priorité : HIGH → MEDIUM → LOW
  const order: Record<RecommendationPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return recommendations.sort((a, b) => order[a.priority] - order[b.priority]);
}
