import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminRecommendations } from '@/services/recommendationService';
import type { AdminRecommendation, RecommendationPriority, RecommendationType } from '@/services/recommendationService';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, Sparkles, ArrowRight, HardHat, Users, FileText, Clock } from 'lucide-react';
import Link from 'next/link';

const PRIORITY_CONFIG: Record<RecommendationPriority, {
  icon: React.ElementType;
  label: string;
  cardBorder: string;
  badge: string;
}> = {
  HIGH:   { icon: AlertTriangle, label: 'Urgent',  cardBorder: 'border-l-4 border-l-red-500 bg-red-50/30',    badge: 'bg-red-50 text-red-700 border-red-200' },
  MEDIUM: { icon: AlertCircle,  label: 'Moyen',   cardBorder: 'border-l-4 border-l-orange-400 bg-orange-50/20', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  LOW:    { icon: Info,          label: 'Info',     cardBorder: 'border-l-4 border-l-blue-400 bg-blue-50/20',   badge: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const TYPE_CONFIG: Record<RecommendationType, { label: string; icon: React.ElementType }> = {
  last_visit_missing:     { label: 'Dernière visite', icon: HardHat },
  project_deadline_soon:  { label: 'Délai serré',     icon: Clock },
  project_overdue:        { label: 'En retard',        icon: AlertTriangle },
  technician_inactive:    { label: 'Inactivité',       icon: Users },
  report_rejected_pending:{ label: 'Rapport rejeté',   icon: FileText },
  unassigned_project:     { label: 'Sans équipe',      icon: HardHat },
};

function groupByPriority(recs: AdminRecommendation[]) {
  return {
    HIGH:   recs.filter(r => r.priority === 'HIGH'),
    MEDIUM: recs.filter(r => r.priority === 'MEDIUM'),
    LOW:    recs.filter(r => r.priority === 'LOW'),
  };
}

export default async function RecommendationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') redirect('/dashboard');

  const recommendations = await getAdminRecommendations(currentUser.organizationId);
  const groups = groupByPriority(recommendations);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Recommandations</h1>
          {recommendations.length > 0 && (
            <Badge variant="secondary" className="ml-1">{recommendations.length}</Badge>
          )}
        </div>
        <p className="text-gray-500 text-sm">Actions suggérées pour maintenir la cohérence de vos projets et équipes.</p>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <Sparkles className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Tout est en ordre !</h2>
          <p className="text-gray-500 text-sm">Aucune action requise en ce moment. Revenez régulièrement.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(['HIGH', 'MEDIUM', 'LOW'] as RecommendationPriority[]).map(priority => {
            const recs = groups[priority];
            if (recs.length === 0) return null;
            const cfg = PRIORITY_CONFIG[priority];
            const PriorityIcon = cfg.icon;

            return (
              <section key={priority}>
                <div className="flex items-center gap-2 mb-3">
                  <PriorityIcon className="h-4 w-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {cfg.label} — {recs.length} élément{recs.length > 1 ? 's' : ''}
                  </h2>
                </div>

                <div className="space-y-3">
                  {recs.map(rec => {
                    const typeCfg = TYPE_CONFIG[rec.type];
                    const TypeIcon = typeCfg.icon;
                    return (
                      <Link key={rec.id} href={rec.link} className="block group">
                        <div className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.cardBorder} hover:shadow-md transition-all`}>
                          <div className="h-10 w-10 rounded-lg bg-white border flex items-center justify-center shrink-0 shadow-sm">
                            <TypeIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-gray-900 text-sm leading-snug">{rec.title}</p>
                              <Badge variant="outline" className={`text-xs shrink-0 ${cfg.badge}`}>
                                {typeCfg.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 shrink-0 mt-1 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
