'use client';

import { useState, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import {
  FileText, CheckCircle, AlertTriangle as KpiAlertTriangle, LayoutDashboard,
  ListChecks, UserCheck, Clock, Bot, Users as UsersIconLucide, HardHat,
  AlertCircle as AlertCircleIcon, FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { KpiCard } from './components/KpiCard';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';
import { MonthlyReportsChart } from './components/MonthlyReportsChart';
import { ProjectAssignmentsCard } from './components/ProjectAssignmentsCard';
import { AlertsCard } from './components/AlertsCard';
import { ScheduleView } from './components/ScheduleView';
import { OnboardingChecklist } from './components/OnboardingChecklist';
import { RecommendationsWidget } from './components/RecommendationsWidget';
import { ProjectDateFilter } from './components/ProjectDateFilter';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow, startOfDay, endOfDay, parseISO, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import type { DateRange } from 'react-day-picker';
import { REPORT_STATUS_BADGE_VARIANT, MATERIAL_TYPE_DISPLAY } from '@/lib/report-constants';
import { useDashboardData } from './hooks/useDashboardData';
import { useCompliancePrediction } from './hooks/useCompliancePrediction';
import { useDashboardCharts } from './hooks/useDashboardCharts';

export default function DashboardPage() {
  const {
    allReportsData, allProjectsData, allUsersData, currentUserDetails,
    isLoadingDashboardData, dashboardError, role, authLoading,
  } = useDashboardData();

  const { currentCompliancePrediction, isLoadingCompliance, complianceError } =
    useCompliancePrediction(role, allReportsData, allProjectsData);

  const { materialUsageData, supplierUsageData, monthlyChartData, complianceTrendData } =
    useDashboardCharts(allReportsData);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: startOfDay(new Date()),
  });

  const adminKpiData = useMemo(() => {
    const predictedComplianceValue = currentCompliancePrediction?.predictedCompliancePercentage;
    const complianceTrend = currentCompliancePrediction
      ? predictedComplianceValue && predictedComplianceValue > 90 ? 'En amélioration' : 'Stable'
      : 'N/A';
    const thisMonth = format(new Date(), 'yyyy-MM');
    const testsThisMonth = allReportsData.filter(
      (r) => r.testTypeId && format(new Date(r.createdAt), 'yyyy-MM') === thisMonth
    ).length;

    return [
      { title: 'Total Rapports', value: allReportsData.length, icon: FileText, trend: '', trendDirection: 'neutral' as const },
      { title: 'En Attente de Validation', value: allReportsData.filter((r) => r.status === 'SUBMITTED').length, icon: KpiAlertTriangle, trend: '', trendDirection: 'neutral' as const },
      { title: 'Rapports Validés', value: allReportsData.filter((r) => r.status === 'VALIDATED').length, icon: CheckCircle, trend: '', trendDirection: 'neutral' as const },
      { title: 'Tests Spécialisés ce Mois', value: testsThisMonth, icon: FlaskConical, trend: '', trendDirection: 'neutral' as const, description: 'Rapports avec type de test spécialisé ce mois.' },
      {
        title: 'Prédiction Conformité IA',
        value: isLoadingCompliance ? '...' : predictedComplianceValue !== undefined ? `${predictedComplianceValue.toFixed(1)}%` : 'N/A',
        icon: Bot,
        trend: isLoadingCompliance ? '' : complianceError ? 'Erreur' : complianceTrend,
        trendDirection: (complianceError ? 'neutral' : predictedComplianceValue && predictedComplianceValue > 90 ? 'up' : 'neutral') as 'up' | 'down' | 'neutral',
        description: complianceError ?? (isLoadingCompliance ? 'Calcul en cours...' : ''),
        tooltipContent: currentCompliancePrediction ? (
          <div className="text-xs p-1 max-w-xs">
            <p className="font-semibold">Raisons :</p>
            <p className="whitespace-pre-wrap mb-2">{currentCompliancePrediction.reasons}</p>
            <p className="font-semibold">Actions suggérées :</p>
            <p className="whitespace-pre-wrap">{currentCompliancePrediction.suggestedActions}</p>
          </div>
        ) : complianceError ? <p className="text-xs">{complianceError}</p> : undefined,
      },
    ];
  }, [allReportsData, currentCompliancePrediction, isLoadingCompliance, complianceError]);

  const technicianKpiData = useMemo(() => {
    const thisMonth = format(new Date(), 'yyyy-MM');
    const testsThisMonth = allReportsData.filter(
      (r) => r.testTypeId && format(new Date(r.createdAt), 'yyyy-MM') === thisMonth
    ).length;
    return [
      { title: 'Mes Rapports Soumis', value: allReportsData.filter((r) => r.status !== 'DRAFT').length, icon: FileText, description: 'Total des rapports que vous avez soumis.' },
      { title: "En Attente de Mon Examen", value: allReportsData.filter((r) => r.status === 'SUBMITTED' || r.status === 'REJECTED').length, icon: ListChecks, description: 'Rapports nécessitant une action ou soumis.' },
      { title: 'Mes Rapports Validés', value: allReportsData.filter((r) => r.status === 'VALIDATED').length, icon: UserCheck, description: 'Rapports approuvés.' },
      { title: 'Rapports en Brouillon', value: allReportsData.filter((r) => r.status === 'DRAFT').length, icon: Clock, description: 'Rapports sauvegardés comme brouillons.' },
      { title: 'Tests Spécialisés ce Mois', value: testsThisMonth, icon: FlaskConical, description: 'Vos rapports avec un type de test spécialisé ce mois.' },
    ];
  }, [allReportsData]);

  const sortedTechnicianReports = useMemo(
    () => [...allReportsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allReportsData]
  );

  const filteredProjectsForAssignments = useMemo(() => {
    const rangeStart = startOfDay(dateRange?.from ?? new Date());
    const rangeEnd = endOfDay(dateRange?.to ?? rangeStart);
    return allProjectsData
      .filter((p) => {
        if (p.status === 'COMPLETED' || p.status === 'INACTIVE') return false;
        if (!p.startDate) return false;
        const projectStart = startOfDay(parseISO(p.startDate));
        if (isNaN(projectStart.getTime())) return false;
        if (p.endDate) {
          const projectEnd = endOfDay(parseISO(p.endDate));
          if (isNaN(projectEnd.getTime())) return false;
          return !isAfter(projectStart, rangeEnd) && !isBefore(projectEnd, rangeStart);
        }
        return !isAfter(projectStart, rangeEnd);
      })
      .sort((a, b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
  }, [allProjectsData, dateRange]);

  // ─── États de chargement / erreur ────────────────────────────────────────────

  if (authLoading || isLoadingDashboardData) {
    return (
      <>
        <PageTitle title="Aperçu du Tableau de Bord" icon={LayoutDashboard} subtitle="Chargement de vos informations personnalisées..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-lg mb-6" />
      </>
    );
  }

  if (dashboardError) {
    return (
      <>
        <PageTitle title="Erreur du Tableau de Bord" icon={KpiAlertTriangle} subtitle="Impossible de charger les données du tableau de bord." />
        <Card>
          <CardHeader><CardTitle>Détails de l&apos;erreur</CardTitle></CardHeader>
          <CardContent>
            <p className="text-destructive">{dashboardError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 rounded-lg">Réessayer de charger</Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const noReports = allReportsData.length === 0;
  const noProjects = (role === 'ADMIN' || role === 'SUPERVISOR') && allProjectsData.length === 0;

  // ─── Rendu principal ──────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <PageTitle
        title={role === 'ADMIN' || role === 'SUPERVISOR' ? 'Aperçu du Tableau de Bord' : 'Mon Tableau de Bord'}
        icon={LayoutDashboard}
        subtitle={role === 'ADMIN' || role === 'SUPERVISOR' ? 'Indicateurs clés et aperçus de vos projets.' : 'Votre résumé personnel des rapports et activités.'}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <FileText className="mr-2 h-4 w-4" /> Créer un Nouveau Rapport
            </Link>
          </Button>
        }
      />

      {/* ── Vue ADMIN / SUPERVISOR ── */}
      {(role === 'ADMIN' || role === 'SUPERVISOR') && (
        <>
          {role === 'ADMIN' && (
            <>
              <OnboardingChecklist
                hasProjects={allProjectsData.length > 0}
                hasTeamMembers={allUsersData.length > 1}
                hasReports={allReportsData.length > 0}
              />
              <RecommendationsWidget />
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
            {adminKpiData.map((kpi) =>
              kpi.tooltipContent ? (
                <Tooltip key={kpi.title} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <KpiCard title={kpi.title} value={kpi.value} icon={kpi.icon} trend={kpi.trend} trendDirection={kpi.trendDirection} description={kpi.description} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border-border shadow-xl">
                    {kpi.tooltipContent}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} trend={kpi.trend} trendDirection={kpi.trendDirection} description={kpi.description} />
              )
            )}
          </div>

          <div className="mb-6">
            <AlertsCard projects={allProjectsData} users={allUsersData} />
          </div>

          <ProjectDateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />

          <div className="mb-6">
            {noProjects ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><HardHat className="mr-2 h-5 w-5 text-muted-foreground" />Aucun Projet Trouvé</CardTitle>
                  <CardDescription>Il n&apos;y a actuellement aucun projet dans le système.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Vous pouvez commencer par <Link href="/admin/projects" className="text-primary hover:underline">ajouter de nouveaux projets</Link>.</p>
                </CardContent>
              </Card>
            ) : (
              <ProjectAssignmentsCard projects={filteredProjectsForAssignments} users={allUsersData} />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {noReports && !noProjects && (
              <div className="lg:col-span-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Aucun Rapport Trouvé</CardTitle>
                    <CardDescription>Il n&apos;y a actuellement aucun rapport dans le système.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>Vous pouvez commencer par <Link href="/reports/create" className="text-primary hover:underline">créer un nouveau rapport</Link>.</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {!noReports && !noProjects && (
              <>
                <div className="lg:col-span-2"><MonthlyReportsChart data={monthlyChartData} /></div>
                <MaterialReportsChart data={materialUsageData} />
                <SupplierUsageChart data={supplierUsageData} />
                <ComplianceTrendChart data={complianceTrendData} />
                <ActivityLog reports={allReportsData} />
              </>
            )}
            {noProjects && (
              <div className="lg:col-span-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Analyses Indisponibles</CardTitle>
                    <CardDescription>Les analyses basées sur les rapports nécessitent des données de projet et de rapport.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Vue TECHNICIEN ── */}
      {role === 'TECHNICIAN' && (
        <>
          {noReports && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Aucun Rapport Trouvé</CardTitle>
                <CardDescription>Vous n&apos;avez pas encore soumis de rapport.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Vous pouvez commencer par <Link href="/reports/create" className="text-primary hover:underline">créer un nouveau rapport</Link>.</p>
              </CardContent>
            </Card>
          )}

          {!noReports && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
                {technicianKpiData.map((kpi) => (
                  <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} description={kpi.description} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Rapports récents */}
                <Card className="lg:col-span-1 shadow-lg rounded-lg">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle>Mes Rapports Récents</CardTitle>
                      <CardDescription>Aperçu rapide de votre dernière activité.</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="shrink-0 text-xs text-primary">
                      <Link href="/reports">Voir tous →</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {sortedTechnicianReports.slice(0, 5).map((report) => (
                      <div key={report.id} className="mb-3 pb-3 border-b last:border-b-0 last:pb-0 last:mb-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-xs" title={`Rapport ${report.id}`}>
                            Rapport {report.id.substring(0, 6)}... ({report.projectId})
                          </span>
                          <Badge variant={REPORT_STATUS_BADGE_VARIANT[report.status]}>{report.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {MATERIAL_TYPE_DISPLAY[report.materialType] || report.materialType} -{' '}
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Utilisation des matériaux */}
                <Card className="lg:col-span-1 shadow-lg rounded-lg">
                  <CardHeader>
                    <CardTitle>Mon Utilisation des Matériaux</CardTitle>
                    <CardDescription>Répartition des matériaux dans vos rapports.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72 flex items-center justify-center">
                    {materialUsageData.filter((m) => m.reports > 0).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={materialUsageData.filter((m) => m.reports > 0)}
                            dataKey="reports"
                            nameKey="material"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {materialUsageData.filter((m) => m.reports > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} rapports`, name as string]} />
                          <RechartsLegend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">Aucune donnée de matériau à afficher.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Rappels & Alertes */}
                <Card className="lg:col-span-1 shadow-lg rounded-lg h-full">
                  <CardHeader>
                    <CardTitle>Rappels &amp; Alertes</CardTitle>
                    <CardDescription>Actions importantes ou avis système.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {allReportsData.filter((r) => r.status === 'REJECTED').length > 0 && (
                      <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                        <p className="text-sm text-destructive font-medium">
                          Vous avez {allReportsData.filter((r) => r.status === 'REJECTED').length} rapport(s) rejeté(s) nécessitant votre attention.
                        </p>
                      </div>
                    )}
                    {allReportsData.filter((r) => r.status === 'DRAFT').length > 0 && (
                      <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                        <p className="text-sm text-amber-700 font-medium">
                          Vous avez {allReportsData.filter((r) => r.status === 'DRAFT').length} rapport(s) en brouillon.
                        </p>
                      </div>
                    )}
                    {allReportsData.filter((r) => r.status === 'REJECTED').length === 0 &&
                      allReportsData.filter((r) => r.status === 'DRAFT').length === 0 && (
                        <p className="text-muted-foreground text-sm">Aucun rappel urgent actuellement.</p>
                      )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {isLoadingDashboardData || !currentUserDetails ? (
            <Skeleton className="h-[400px] w-full rounded-lg mt-6" />
          ) : (
            <ScheduleView assignments={currentUserDetails.assignments || []} allProjects={allProjectsData} />
          )}
        </>
      )}
    </TooltipProvider>
  );
}
