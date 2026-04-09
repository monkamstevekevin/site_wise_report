
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTitle } from '@/components/common/PageTitle';
import {
  HardHat, ArrowLeft, Loader2, AlertTriangleIcon, FileText,
  CheckCircle, XCircle, Clock, MapPin, CalendarDays,
  MessageSquare, BarChart3, AlertTriangle, ShieldCheck, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getProjectById } from '@/services/projectService';
import { getReportsByProjectIdSubscription } from '@/lib/reportClientService';
import type { Project, FieldReport } from '@/lib/types';
import { DownloadProjectSummaryButton } from '@/components/pdf/DownloadProjectSummaryButton';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── helpers ─────────────────────────────────────────────────────────────────

const materialDisplay: Record<string, string> = {
  cement: 'Ciment', asphalt: 'Asphalte', gravel: 'Gravier', sand: 'Sable', other: 'Autre',
};

const statusBadgeVariant: Record<FieldReport['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'outline', SUBMITTED: 'secondary', VALIDATED: 'default', REJECTED: 'destructive',
};

const STATUS_COLORS: Record<string, string> = {
  VALIDATED: 'hsl(142, 71%, 45%)',
  REJECTED:  'hsl(var(--destructive))',
  SUBMITTED: 'hsl(217, 91%, 60%)',
  DRAFT:     'hsl(215, 16%, 60%)',
};

const formatDate = (d?: string) => {
  if (!d) return 'N/D';
  try { const p = parseISO(d); return isValid(p) ? format(p, 'd MMM yyyy', { locale: fr }) : 'N/D'; }
  catch { return 'N/D'; }
};

// ─── KpiCard local ────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
            {sub && <p className="text-xs text-muted-foreground/70">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectStatsPage() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch project
  useEffect(() => {
    getProjectById(projectId)
      .then((p) => { setProject(p ?? null); setLoadingProject(false); })
      .catch(() => { setError('Impossible de charger le projet.'); setLoadingProject(false); });
  }, [projectId]);

  // Subscribe to reports
  useEffect(() => {
    const unsub = getReportsByProjectIdSubscription(
      projectId,
      (data) => { setReports(data); setLoadingReports(false); },
      () => { setLoadingReports(false); }
    );
    return unsub;
  }, [projectId]);

  // Fetch total hours for HOURS-type projects
  useEffect(() => {
    if (!project || project.projectType !== 'HOURS') return;
    fetch(`/api/time-entries?projectId=${projectId}`)
      .then((res) => res.json())
      .then((entries: { durationMinutes: string | number }[]) => {
        const totalMinutes = entries.reduce((acc, e) => acc + Number(e.durationMinutes), 0);
        setTotalHours(Math.round((totalMinutes / 60) * 10) / 10);
      })
      .catch(() => setTotalHours(0));
  }, [project, projectId]);

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total      = reports.length;
    const validated  = reports.filter(r => r.status === 'VALIDATED').length;
    const rejected   = reports.filter(r => r.status === 'REJECTED').length;
    const submitted  = reports.filter(r => r.status === 'SUBMITTED').length;
    const drafts     = reports.filter(r => r.status === 'DRAFT').length;
    const anomalies  = reports.filter(r => r.aiIsAnomalous === true).length;
    const decided    = validated + rejected;
    const conformity = decided > 0 ? Math.round((validated / decided) * 100) : null;

    const pieData = [
      { name: 'Validés',    value: validated,  fill: STATUS_COLORS.VALIDATED },
      { name: 'Rejetés',    value: rejected,   fill: STATUS_COLORS.REJECTED  },
      { name: 'En attente', value: submitted,  fill: STATUS_COLORS.SUBMITTED },
      { name: 'Brouillons', value: drafts,     fill: STATUS_COLORS.DRAFT     },
    ].filter(d => d.value > 0);

    return { total, validated, rejected, submitted, drafts, anomalies, conformity, pieData };
  }, [reports]);

  const loading = loadingProject || loadingReports;

  const pageActions = (
    <div className="flex items-center gap-2">
      {project && reports.length > 0 && (
        <DownloadProjectSummaryButton
          project={project}
          reports={reports}
          variant="default"
          size="sm"
          className="rounded-lg"
        />
      )}
      {project && (
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link href={`/project/${projectId}/chat`}>
            <MessageSquare className="mr-2 h-4 w-4" /> Chat IA
          </Link>
        </Button>
      )}
      <Button asChild variant="outline" size="sm" className="rounded-lg">
        <Link href="/my-projects">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Link>
      </Button>
    </div>
  );

  if (loading) {
    return (
      <>
        <PageTitle title="Statistiques du Projet" icon={HardHat} subtitle="Chargement..." actions={pageActions} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <PageTitle title="Projet introuvable" icon={AlertTriangleIcon} subtitle={error ?? ''} actions={pageActions} />
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={project.name}
        icon={HardHat}
        subtitle={project.description ?? 'Statistiques de conformité du projet'}
        actions={pageActions}
      />

      {/* ── Infos projet ───────────────────────────────────────────────────── */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {project.location}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </span>
            <Badge variant={project.status === 'ACTIVE' ? 'default' : project.status === 'COMPLETED' ? 'secondary' : 'outline'}>
              {project.status === 'ACTIVE' ? 'Actif' : project.status === 'COMPLETED' ? 'Terminé' : 'Inactif'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Progression du projet ───────────────────────────────────────────── */}
      {project.projectType !== 'OPEN' && (
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Progression du projet</span>
            </div>
            {project.projectType === 'VISITS' && (() => {
              const current = stats.validated;
              const target = project.targetVisits ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{current} / {target} visites validées</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
            {project.projectType === 'HOURS' && (() => {
              const target = project.targetHours ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((totalHours / target) * 100)) : 0;
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{totalHours} / {target} heures</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      {project.projectType === 'OPEN' && (
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 text-primary" />
              <span>{stats.total} rapport(s) au total — projet sans cible fixée</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total Rapports"     value={stats.total}      icon={FileText}      color="bg-blue-500" />
        <Kpi
          label="Taux de Conformité"
          value={stats.conformity !== null ? `${stats.conformity}%` : 'N/D'}
          sub={`${stats.validated} validé(s) / ${stats.validated + stats.rejected} décidé(s)`}
          icon={ShieldCheck}
          color={stats.conformity !== null && stats.conformity >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}
        />
        <Kpi label="Anomalies IA"       value={stats.anomalies}  icon={AlertTriangle} color={stats.anomalies > 0 ? 'bg-orange-500' : 'bg-slate-400'} />
        <Kpi label="En Attente"         value={stats.submitted}  icon={Clock}         color={stats.submitted > 0 ? 'bg-amber-500' : 'bg-slate-400'} />
      </div>

      {/* ── Charts + Rapports récents ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pie chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Répartition des Statuts
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {stats.pieData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun rapport pour ce projet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.pieData} dataKey="value" nameKey="name" cx="50%" cy="45%"
                    outerRadius={80} innerRadius={45} labelLine={false}>
                    {stats.pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} rapport(s)`, n as string]} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rapports récents */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center">
                <FileText className="mr-2 h-4 w-4 text-primary" /> Rapports Récents
              </CardTitle>
              <CardDescription>{stats.total} rapport(s) au total</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
              <Link href={`/reports?projectId=${projectId}`}>Voir tous →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Aucun rapport pour ce projet.</p>
                <Button asChild size="sm" className="mt-3 rounded-lg">
                  <Link href="/reports/create">Créer un rapport</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 8).map(report => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/reports/view/${report.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'p-1.5 rounded-full flex-shrink-0',
                        report.status === 'VALIDATED' ? 'bg-emerald-500' :
                        report.status === 'REJECTED'  ? 'bg-destructive'  :
                        report.status === 'SUBMITTED' ? 'bg-blue-500'     : 'bg-slate-400'
                      )}>
                        {report.status === 'VALIDATED' ? <CheckCircle className="h-3.5 w-3.5 text-white" /> :
                         report.status === 'REJECTED'  ? <XCircle     className="h-3.5 w-3.5 text-white" /> :
                                                         <Clock       className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {materialDisplay[report.materialType] || report.materialType} — Lot {report.batchNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(report.createdAt), 'd MMM yyyy', { locale: fr })}
                          {report.aiIsAnomalous && <span className="ml-2 text-orange-500 font-semibold">⚠ Anomalie IA</span>}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusBadgeVariant[report.status]} className="ml-2 shrink-0 text-xs">
                      {report.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
