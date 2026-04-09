import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, reports, userAssignments, projects } from '@/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';
import { getTotalHoursByUser } from '@/services/timeEntryService';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, FolderOpen } from 'lucide-react';

export default async function TechniciansPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (currentUser?.role !== 'ADMIN') redirect('/dashboard');

  const orgId = currentUser.organizationId!;

  // All technicians in the org
  const technicians = await db
    .select()
    .from(users)
    .where(and(eq(users.organizationId, orgId), eq(users.role, 'TECHNICIAN')));

  // Start of current month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Compute stats for each technician
  const stats = await Promise.all(technicians.map(async (tech) => {
    const [reportCount] = await db
      .select({ c: count() })
      .from(reports)
      .where(and(
        eq(reports.technicianId, tech.id),
        eq(reports.organizationId, orgId),
        gte(reports.createdAt, startOfMonth)
      ));

    const hoursThisMonth = await getTotalHoursByUser(tech.id, orgId, startOfMonth);

    const [projectCount] = await db
      .select({ c: count() })
      .from(userAssignments)
      .innerJoin(projects, and(
        eq(userAssignments.projectId, projects.id),
        eq(projects.status, 'ACTIVE')
      ))
      .where(eq(userAssignments.userId, tech.id));

    return {
      ...tech,
      reportsThisMonth: Number(reportCount?.c ?? 0),
      hoursThisMonth,
      activeProjects: Number(projectCount?.c ?? 0),
    };
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des techniciens</h1>
        <p className="text-gray-500 text-sm mt-1">Activité du mois en cours</p>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun technicien dans cette organisation.</div>
      ) : (
        <div className="grid gap-4">
          {stats.map((tech) => (
            <div key={tech.id} className="border rounded-xl p-5 bg-white flex items-center justify-between shadow-sm">
              <div>
                <p className="font-semibold text-gray-900">{tech.name}</p>
                <p className="text-sm text-gray-500">{tech.email}</p>
                <Badge variant="outline" className="mt-1 text-xs">Technicien</Badge>
              </div>
              <div className="flex gap-8 text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-blue-600">
                    <FileText className="h-4 w-4" />
                    <span className="text-xl font-bold">{tech.reportsThisMonth}</span>
                  </div>
                  <span className="text-xs text-gray-400">Rapports ce mois</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-green-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-xl font-bold">{tech.hoursThisMonth}h</span>
                  </div>
                  <span className="text-xs text-gray-400">Heures ce mois</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-orange-600">
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-xl font-bold">{tech.activeProjects}</span>
                  </div>
                  <span className="text-xs text-gray-400">Projets actifs</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
