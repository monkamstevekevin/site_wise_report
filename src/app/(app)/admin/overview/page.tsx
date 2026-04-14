import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, projects, reports, userAssignments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { MapPin, FileText, Users } from 'lucide-react';

export default async function OverviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') redirect('/dashboard');

  const orgId = currentUser.organizationId;

  const activeProjects = await db
    .select()
    .from(projects)
    .where(and(eq(projects.organizationId, orgId), eq(projects.status, 'ACTIVE')));

  const projectData = await Promise.all(activeProjects.map(async (project) => {
    const assignments = await db
      .select({
        userId: userAssignments.userId,
        userName: users.name,
        userRole: users.role,
      })
      .from(userAssignments)
      .leftJoin(users, eq(userAssignments.userId, users.id))
      .where(eq(userAssignments.projectId, project.id));

    const [lastReport] = await db
      .select({ createdAt: reports.createdAt, technicianId: reports.technicianId })
      .from(reports)
      .where(eq(reports.projectId, project.id))
      .orderBy(desc(reports.createdAt))
      .limit(1);

    const lastReporter = lastReport
      ? assignments.find(a => a.userId === lastReport.technicianId)
      : null;

    return { project, assignments, lastReport, lastReporter };
  }));

  function timeAgo(dateStr: Date | string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days} jours`;
    if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
    return `il y a ${Math.floor(days / 30)} mois`;
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    SUPERVISOR: 'Superviseur',
    TECHNICIAN: 'Technicien',
  };

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    SUPERVISOR: 'bg-violet-50 text-violet-700 border-violet-200',
    TECHNICIAN: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Qui est où ?</h1>
        <p className="text-gray-500 text-sm mt-1">Vue des projets actifs et de leurs équipes</p>
      </div>

      {projectData.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucun projet actif.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projectData.map(({ project, assignments, lastReport, lastReporter }) => (
            <div key={project.id} className="border rounded-xl bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{project.name}</h2>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {project.location}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {assignments.length} membre{assignments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Team */}
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-3">
                  <Users className="h-3.5 w-3.5" />
                  Équipe assignée
                </div>
                {assignments.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun membre assigné</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {assignments.map((a) => (
                      <div key={a.userId} className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2.5 py-1.5">
                        <span className="text-xs font-medium text-gray-700">{a.userName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${ROLE_COLORS[a.userRole ?? 'TECHNICIAN']}`}>
                          {ROLE_LABELS[a.userRole ?? 'TECHNICIAN']}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Last report */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  Dernier rapport
                </div>
                {lastReport ? (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{lastReporter?.userName ?? 'Inconnu'}</span>
                    {' — '}{timeAgo(lastReport.createdAt)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Aucun rapport soumis</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
