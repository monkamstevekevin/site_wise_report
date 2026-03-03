
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle as KpiAlertTriangle, LayoutDashboard, ListChecks, UserCheck, Clock, Bot, Users as UsersIconLucide, HardHat, AlertCircle as AlertCircleIcon, Calendar as CalendarIconLucide, Filter as FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';
import { ProjectAssignmentsCard } from './components/ProjectAssignmentsCard';
import { AlertsCard } from './components/AlertsCard';
import { ScheduleView } from './components/ScheduleView';
import { useAuth } from '@/contexts/AuthContext'; 
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';
import type { FieldReport, MaterialType, Project, User, UserAssignment } from '@/lib/types';
import { getReportsSubscription, getReportsByTechnicianIdSubscription } from '@/lib/reportClientService';
import { getProjectsSubscription } from '@/lib/projectClientService';
import { getUsersSubscription, getUserByIdSubscription } from '@/lib/userClientService';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isSameDay, startOfDay, endOfDay, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale'; // Import French locale
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import { predictCompliancePercentage, type CompliancePredictionOutput } from '@/ai/flows/compliance-prediction';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';


interface MappedUserRoleAndId { 
  role: UserRole;
  effectiveTechnicianId: string | null;
}

const mapFirebaseUserToAppRoleAndId = (firebaseUser: any): MappedUserRoleAndId => {
  if (!firebaseUser) return { role: 'TECHNICIAN', effectiveTechnicianId: null };
  
  if (firebaseUser.email === 'janesteve237@gmail.com') {
    return { role: 'ADMIN', effectiveTechnicianId: null }; 
  }
  if (firebaseUser.email === MOCK_TECHNICIAN_EMAIL) {
    return { role: 'TECHNICIAN', effectiveTechnicianId: MOCK_TECHNICIAN_REPORTS_ID };
  }
  if (firebaseUser.email?.includes('admin@example.com')) return { role: 'ADMIN', effectiveTechnicianId: null };
  if (firebaseUser.email?.includes('supervisor@example.com')) return { role: 'SUPERVISOR', effectiveTechnicianId: null };
  
  return { role: 'TECHNICIAN', effectiveTechnicianId: firebaseUser.uid }; 
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
};

const materialTypeDisplay: Record<string, string> = { 
  cement: "Ciment",
  asphalt: "Asphalte",
  gravel: "Gravier",
  sand: "Sable",
  other: "Autre",
};

const materialColors: { [key: string]: string } = {
  cement: 'hsl(var(--chart-1))',
  asphalt: 'hsl(var(--chart-2))',
  gravel: 'hsl(var(--chart-3))',
  sand: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

const supplierChartColors: string[] = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))', 
];


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  
  const [allReportsData, setAllReportsData] = useState<FieldReport[]>([]);
  const [allProjectsData, setAllProjectsData] = useState<Project[]>([]);
  const [allUsersData, setAllUsersData] = useState<User[]>([]);
  const [currentUserDetails, setCurrentUserDetails] = useState<User | null>(null);
  
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [currentCompliancePrediction, setCurrentCompliancePrediction] = useState<CompliancePredictionOutput | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: startOfDay(new Date()),
  });

  const { role, effectiveTechnicianId } = useMemo(() => mapFirebaseUserToAppRoleAndId(user), [user]);


  useEffect(() => {
    if (authLoading) {
      setIsLoadingDashboardData(true);
      return;
    }
    if (!user) {
      setIsLoadingDashboardData(false);
      return;
    }

    const subscriptions: (() => void)[] = [];
    let active = true;

    const handleSubscriptionError = (entity: string) => (error: Error) => {
        if (active) {
            console.error(`Error subscribing to ${entity}:`, error);
            setDashboardError(prev => prev || `Failed to load ${entity}.`);
            setIsLoadingDashboardData(false);
        }
    };
    
    if (role === 'ADMIN' || role === 'SUPERVISOR') {
        subscriptions.push(getReportsSubscription(
            (data) => active && setAllReportsData(data),
            handleSubscriptionError('reports')
        ));
        subscriptions.push(getProjectsSubscription(
            (data) => active && setAllProjectsData(data),
            handleSubscriptionError('projects')
        ));
        subscriptions.push(getUsersSubscription(
            (data) => active && setAllUsersData(data),
            handleSubscriptionError('users')
        ));
    } else if (role === 'TECHNICIAN' && effectiveTechnicianId) {
        subscriptions.push(getReportsByTechnicianIdSubscription(
            effectiveTechnicianId,
            (data) => active && setAllReportsData(data),
            handleSubscriptionError('technician reports')
        ));
        // Technicians still need all projects for the schedule view
        subscriptions.push(getProjectsSubscription(
            (data) => active && setAllProjectsData(data),
            handleSubscriptionError('projects')
        ));
        subscriptions.push(getUserByIdSubscription(
            user.uid,
            (data) => active && setCurrentUserDetails(data),
            handleSubscriptionError('current user details')
        ));
    }
    
    if(subscriptions.length > 0) {
      setIsLoadingDashboardData(false); // Assume data will stream in
    } else {
      setIsLoadingDashboardData(false);
    }

    return () => {
      active = false;
      subscriptions.forEach(unsub => unsub());
    };

  }, [user, authLoading, role, effectiveTechnicianId]); 

  useEffect(() => {
    if (role === 'ADMIN' || role === 'SUPERVISOR') {
      const fetchCompliancePrediction = async () => {
        setIsLoadingCompliance(true);
        setComplianceError(null);
        try {
          const mockHistoricalData = "3 derniers mois : 85% de conformité. Projet X précédent : 90% de conformité. Projet Y : 78% dans des conditions similaires.";
          const mockCurrentConditions = "Projet actuel : Revêtement routier. Météo : Bonne, 25°C. Personnel : Équipe complète. Livraison matériel : À temps pour l'asphalte, léger retard pour les agrégats. Équipement : Tout opérationnel.";
          const mockValidationRules = "Asphalte PG 64-22 : Plage de température 135-160°C. Densité : 92-97% de Marshall. Compactage : Min 8 passes. Affaissement béton : 75-125mm.";
          
          const prediction = await predictCompliancePercentage({
            historicalData: mockHistoricalData,
            currentConditions: mockCurrentConditions,
            validationRules: mockValidationRules,
          });
          setCurrentCompliancePrediction(prediction);
        } catch (err) {
          console.error("Error fetching compliance prediction:", err);
          setComplianceError((err as Error).message || "Échec de l'obtention de la prédiction de conformité IA.");
        } finally {
          setIsLoadingCompliance(false);
        }
      };
      fetchCompliancePrediction();
    }
  }, [role]);
  
  const adminKpiData = useMemo(() => {
    const predictedComplianceValue = currentCompliancePrediction?.predictedCompliancePercentage;
    const complianceTrend = currentCompliancePrediction ? (predictedComplianceValue && predictedComplianceValue > 90 ? "En amélioration" : "Stable") : "N/A";

    return [
        { title: "Total Rapports", value: allReportsData.length, icon: FileText, trend: "", trendDirection: "neutral" as const }, 
        { title: "En Attente de Validation", value: allReportsData.filter(r => r.status === 'SUBMITTED').length, icon: KpiAlertTriangle, trend: "", trendDirection: "neutral" as const },
        { title: "Rapports Validés", value: allReportsData.filter(r => r.status === 'VALIDATED').length, icon: CheckCircle, trend: "", trendDirection: "neutral" as const },
        { 
          title: "Prédiction Conformité IA", 
          value: isLoadingCompliance ? "..." : (predictedComplianceValue !== undefined ? `${predictedComplianceValue.toFixed(1)}%` : "N/A"), 
          icon: Bot, 
          trend: isLoadingCompliance ? "" : (complianceError ? "Erreur" : complianceTrend), 
          trendDirection: complianceError ? "neutral" : (predictedComplianceValue && predictedComplianceValue > 90 ? "up" : "neutral" as const),
          description: complianceError ? complianceError : (isLoadingCompliance ? "Calcul en cours..." : ""),
          tooltipContent: currentCompliancePrediction ? (
             <div className="text-xs p-1 max-w-xs">
                <p className="font-semibold">Raisons :</p>
                <p className="whitespace-pre-wrap mb-2">{currentCompliancePrediction.reasons}</p>
                <p className="font-semibold">Actions suggérées :</p>
                <p className="whitespace-pre-wrap">{currentCompliancePrediction.suggestedActions}</p>
             </div>
          ) : (complianceError ? <p className="text-xs">{complianceError}</p> : undefined),
        }, 
    ];
  }, [allReportsData, currentCompliancePrediction, isLoadingCompliance, complianceError]);


  const technicianKpiData = useMemo(() => [
    { title: "Mes Rapports Soumis", value: allReportsData.filter(r => r.status !== 'DRAFT').length, icon: FileText, description: "Total des rapports que vous avez soumis." },
    { title: "En Attente de Mon Examen", value: allReportsData.filter(r => r.status === 'SUBMITTED' || r.status === 'REJECTED').length, icon: ListChecks, description: "Rapports nécessitant une action ou soumis." },
    { title: "Mes Rapports Validés", value: allReportsData.filter(r => r.status === 'VALIDATED').length, icon: UserCheck, description: "Rapports approuvés." },
    { title: "Rapports en Brouillon", value: allReportsData.filter(r => r.status === 'DRAFT').length, icon: Clock, description: "Rapports sauvegardés comme brouillons." },
  ], [allReportsData]);
  
  const sortedTechnicianReportsForDisplay = useMemo(() => {
    return [...allReportsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allReportsData]);

  const materialUsageData = useMemo(() => {
    const counts: { [key in MaterialType | string]: number } = { cement: 0, asphalt: 0, gravel: 0, sand: 0, other: 0 }; 
    allReportsData.forEach(report => {
      const materialKey = report.materialType.toLowerCase() as MaterialType | 'other';
      if (counts[materialKey] !== undefined) {
        counts[materialKey]++;
      } else {
        counts.other++; 
      }
    });
    return Object.entries(counts).map(([material, reportCount]) => ({
      material: materialTypeDisplay[material.toLowerCase()] || material.charAt(0).toUpperCase() + material.slice(1), 
      reports: reportCount,
      fill: materialColors[material.toLowerCase() as MaterialType] || materialColors.other,
    }));
  }, [allReportsData]);

  const supplierUsageData = useMemo(() => {
    const supplierCounts: { [key: string]: number } = {};
    allReportsData.forEach(report => {
      const supplier = report.supplier || "Fournisseur Inconnu";
      supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
    });

    const sortedSuppliers = Object.entries(supplierCounts)
      .sort(([, a], [, b]) => b - a);

    const topSuppliers = sortedSuppliers.slice(0, 4);
    const otherCount = sortedSuppliers.slice(4).reduce((sum, [, count]) => sum + count, 0);

    const chartData = topSuppliers.map(([name, reports], index) => ({
      name,
      reports,
      fill: supplierChartColors[index],
    }));

    if (otherCount > 0) {
      chartData.push({
        name: 'Autres Fournisseurs',
        reports: otherCount,
        fill: supplierChartColors[4], 
      });
    }
    return chartData;
  }, [allReportsData]);

  const filteredProjectsForAssignments = useMemo(() => {
    const effectiveFromDate = dateRange?.from || new Date();
    const effectiveToDate = dateRange?.to || effectiveFromDate; 

    const rangeStart = startOfDay(effectiveFromDate);
    const rangeEnd = endOfDay(effectiveToDate);

    return allProjectsData
      .filter(p => {
        if (p.status === 'COMPLETED' || p.status === 'INACTIVE') return false;
        
        const projectStartDateStr = p.startDate;
        const projectEndDateStr = p.endDate;

        if (!projectStartDateStr) return false; 

        const projectStartDate = parseISO(projectStartDateStr);
        if (isNaN(projectStartDate.getTime())) return false; 
        const projectStart = startOfDay(projectStartDate);
        
        if (projectEndDateStr) {
          const projectEndDate = parseISO(projectEndDateStr);
          if (isNaN(projectEndDate.getTime())) return false; 
          const projectEnd = endOfDay(projectEndDate);
          return !isAfter(projectStart, rangeEnd) && !isBefore(projectEnd, rangeStart);
        } else {
          return !isAfter(projectStart, rangeEnd);
        }
      })
      .sort((a, b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
  }, [allProjectsData, dateRange]);


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
  
  if (!user && !authLoading) { 
     return (
      <>
        <PageTitle title="Tableau de Bord" icon={LayoutDashboard} subtitle="Veuillez vous connecter pour voir votre tableau de bord." />
         <div className="text-center py-10">
            <p className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</p>
            <Button asChild className="mt-4 rounded-lg">
              <Link href="/auth/login">Connexion</Link>
            </Button>
          </div>
      </>
    );
  }
  
  if (dashboardError) {
    return (
      <>
        <PageTitle title="Erreur du Tableau de Bord" icon={KpiAlertTriangle} subtitle="Impossible de charger les données du tableau de bord." />
        <Card>
            <CardHeader><CardTitle>Détails de l'erreur</CardTitle></CardHeader>
            <CardContent>
                <p className="text-destructive">{dashboardError}</p>
                <Button onClick={() => window.location.reload()} className="mt-4 rounded-lg">Réessayer de charger</Button>
            </CardContent>
        </Card>
      </>
    )
  }

  const noReportsExistForUser = allReportsData.length === 0;
  const noProjectsExistForAdmin = (role === 'ADMIN' || role === 'SUPERVISOR') && allProjectsData.length === 0;

  return (
    <TooltipProvider>
      <PageTitle
        title={role === 'ADMIN' || role === 'SUPERVISOR' ? "Aperçu du Tableau de Bord" : "Mon Tableau de Bord"}
        icon={LayoutDashboard}
        subtitle={role === 'ADMIN' || role === 'SUPERVISOR' ? "Indicateurs clés et aperçus de vos projets." : "Votre résumé personnel des rapports et activités."}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <FileText className="mr-2 h-4 w-4" /> Créer un Nouveau Rapport
            </Link>
          </Button>
        }
      />

      { (role === 'ADMIN' || role === 'SUPERVISOR') && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {adminKpiData.map((kpi) => (
                kpi.tooltipContent ? (
                  <Tooltip key={kpi.title} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div> 
                          <KpiCard
                            title={kpi.title}
                            value={kpi.value}
                            icon={kpi.icon}
                            trend={kpi.trend}
                            trendDirection={kpi.trendDirection}
                            description={kpi.description}
                          />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card border-border shadow-xl">
                      {kpi.tooltipContent}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <KpiCard
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    icon={kpi.icon}
                    trend={kpi.trend}
                    trendDirection={kpi.trendDirection}
                    description={kpi.description}
                  />
                )
              ))}
          </div>
          
          <div className="mb-6">
            <AlertsCard projects={allProjectsData} users={allUsersData} />
          </div>

          <Card className="mb-6 shadow-lg rounded-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><FilterIcon className="mr-2 h-5 w-5 text-primary"/>Filtres d'Assignation de Projets</CardTitle>
                <CardDescription>Sélectionnez une plage de dates pour afficher les projets pertinents.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2 items-center">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date-range-picker"
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[300px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            isSameDay(dateRange.from, new Date()) && isSameDay(dateRange.to, new Date()) && isSameDay(dateRange.from, dateRange.to) ? "Aujourd'hui" : 
                            `${format(dateRange.from, "dd MMM y", { locale: fr })} - ${format(dateRange.to, "dd MMM y", { locale: fr })}`
                        ) : (
                            isSameDay(dateRange.from, new Date()) ? "Aujourd'hui" : format(dateRange.from, "dd MMM y", { locale: fr })
                        )
                        ) : (
                        <span>Choisir une plage de dates</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={fr}
                    />
                    </PopoverContent>
                </Popover>
                <Button 
                    variant="ghost" 
                    onClick={() => setDateRange({ from: startOfDay(new Date()), to: startOfDay(new Date()) })} 
                    className="w-full sm:w-auto"
                    disabled={dateRange?.from && isSameDay(dateRange.from, new Date()) && dateRange.to && isSameDay(dateRange.to, new Date()) && isSameDay(dateRange.from, dateRange.to) }
                >
                    Aujourd'hui
                </Button>
            </CardContent>
          </Card>

          <div className="mb-6"> 
            {noProjectsExistForAdmin ? (
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><HardHat className="mr-2 h-5 w-5 text-muted-foreground" />Aucun Projet Trouvé</CardTitle>
                    <CardDescription>Il n'y a actuellement aucun projet dans le système pour afficher un aperçu des assignations.</CardDescription>
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
                {noReportsExistForUser && !noProjectsExistForAdmin && (
                    <div className="lg:col-span-full">
                        <Card>
                            <CardHeader>
                                <CardTitle>Aucun Rapport Trouvé</CardTitle>
                                <CardDescription>Il n'y a actuellement aucun rapport dans le système pour afficher les graphiques associés.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p>Vous pouvez commencer par <Link href="/reports/create" className="text-primary hover:underline">créer un nouveau rapport</Link>.</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!noReportsExistForUser && !noProjectsExistForAdmin && (
                    <>
                        <MaterialReportsChart data={materialUsageData} /> 
                        <SupplierUsageChart data={supplierUsageData} />
                        <ComplianceTrendChart />
                        <ActivityLog />
                    </>
                )}
                 {noProjectsExistForAdmin && ( 
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

      { role === 'TECHNICIAN' && (
        <>
         {noReportsExistForUser && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Aucun Rapport Trouvé</CardTitle>
                <CardDescription>Vous n'avez pas encore soumis de rapport, ou aucun rapport ne correspond à la vue actuelle.</CardDescription>
              </CardHeader>
              <CardContent>
                 <p>Vous pouvez commencer par <Link href="/reports/create" className="text-primary hover:underline">créer un nouveau rapport</Link>.</p>
              </CardContent>
            </Card>
          )}
          {!noReportsExistForUser && (
            <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {technicianKpiData.map((kpi) => (
                <KpiCard
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    icon={kpi.icon}
                    description={kpi.description}
                />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>Mes Rapports Récents (5 derniers)</CardTitle>
                    <CardDescription>Aperçu rapide de votre dernière activité.</CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedTechnicianReportsForDisplay.length > 0 ? sortedTechnicianReportsForDisplay.slice(0, 5).map(report => (
                    <div key={report.id} className="mb-3 pb-3 border-b last:border-b-0 last:pb-0 last:mb-0">
                        <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-xs" title={`Rapport ${report.id} pour ${report.projectId}`}>Rapport {report.id.substring(0,6)}... ({report.projectId})</span>
                        <Badge variant={reportStatusBadgeVariant[report.status]}>{report.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                        {(materialTypeDisplay[report.materialType] || report.materialType)} - {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                    </div>
                    )) : <p className="text-sm text-muted-foreground">Aucun rapport soumis pour le moment.</p>}
                </CardContent>
                </Card>
                <Card className="lg:col-span-1 shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>Mon Utilisation des Matériaux</CardTitle>
                    <CardDescription>Répartition des matériaux dans vos rapports.</CardDescription>
                </CardHeader>
                <CardContent className="h-72 flex items-center justify-center">
                    {materialUsageData.filter(m => m.reports > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie data={materialUsageData.filter(m => m.reports > 0)} dataKey="reports" nameKey="material" cx="50%" cy="50%" outerRadius={80} labelLine={false} 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {materialUsageData.filter(m => m.reports > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <RechartsTooltip formatter={(value, name) => [`${value} rapports`, name as string]}/>
                        <RechartsLegend wrapperStyle={{ fontSize: '12px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                    <p className="text-sm text-muted-foreground text-center">Aucune donnée de matériau à afficher.</p>
                    )}
                </CardContent>
                </Card>
                <div className="lg:col-span-1">
                <Card className="shadow-lg rounded-lg h-full">
                    <CardHeader><CardTitle>Rappels & Alertes</CardTitle>
                    <CardDescription>Actions importantes ou avis système.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {allReportsData.filter(r => r.status === 'REJECTED').length > 0 && (
                            <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                                <p className="text-sm text-destructive font-medium">Vous avez {allReportsData.filter(r => r.status === 'REJECTED').length} rapport(s) rejeté(s) nécessitant votre attention.</p>
                            </div>
                        )}
                        {allReportsData.filter(r => r.status === 'DRAFT').length > 0 && (
                            <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                <p className="text-sm text-amber-700 font-medium">Vous avez {allReportsData.filter(r => r.status === 'DRAFT').length} rapport(s) en brouillon.</p>
                            </div>
                        )}
                        {(allReportsData.filter(r => r.status === 'REJECTED').length === 0 && allReportsData.filter(r => r.status === 'DRAFT').length === 0) && (
                            <p className="text-muted-foreground text-sm">Aucun rappel urgent actuellement.</p>
                        )}
                    </CardContent>
                </Card>
                </div>
            </div>
            </>
          )}
          {isLoadingDashboardData || !currentUserDetails ? (
            <Skeleton className="h-[400px] w-full rounded-lg mt-6" />
          ) : (
            <ScheduleView
              assignments={currentUserDetails?.assignments || []}
              allProjects={allProjectsData}
            />
          )}
        </>
      )}
    </TooltipProvider>
  );
}
