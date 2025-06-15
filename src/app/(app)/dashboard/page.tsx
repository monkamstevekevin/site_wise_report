
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle as KpiAlertTriangle, LayoutDashboard, ListChecks, UserCheck, Clock, Bot, Users as UsersIconLucide, HardHat, AlertCircle as AlertCircleIcon, Calendar as CalendarIconLucide, Filter as FilterIcon } from 'lucide-react'; // Added CalendarIconLucide, FilterIcon
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';
import { ProjectAssignmentsCard } from './components/ProjectAssignmentsCard';
import { AlertsCard } from './components/AlertsCard';
import { useAuth } from '@/contexts/AuthContext'; 
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';
import type { FieldReport, MaterialType, Project, User } from '@/lib/types';
import { getReportsByTechnicianId, getReports as getAllReports } from '@/services/reportService'; 
import { getProjects } from '@/services/projectService';
import { getUsers } from '@/services/userService';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow, isSameDay, startOfDay, endOfDay, parseISO, isAfter, isBefore, isEqual } from 'date-fns'; // Added date-fns functions
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import { predictCompliancePercentage, type CompliancePredictionOutput } from '@/ai/flows/compliance-prediction';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'; // Added Popover
import { Calendar } from '@/components/ui/calendar'; // Added Calendar
import type { DateRange } from 'react-day-picker'; // Added DateRange
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
  cement: "Cement",
  asphalt: "Asphalt",
  gravel: "Gravel",
  sand: "Sand",
  other: "Other",
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
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [effectiveTechnicianId, setEffectiveTechnicianId] = useState<string | null>(null);
  
  const [allReportsData, setAllReportsData] = useState<FieldReport[]>([]);
  const [technicianReports, setTechnicianReports] = useState<FieldReport[]>([]);
  const [allProjectsData, setAllProjectsData] = useState<Project[]>([]);
  const [allUsersData, setAllUsersData] = useState<User[]>([]);
  
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [currentCompliancePrediction, setCurrentCompliancePrediction] = useState<CompliancePredictionOutput | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });


  useEffect(() => {
    const loadDashboardData = async () => {
      if (authLoading) { 
        setIsLoadingDashboardData(true); 
        return;
      }
      
      if (!user) { 
        setIsLoadingDashboardData(false);
        setAllReportsData([]);
        setTechnicianReports([]);
        setAllProjectsData([]);
        setAllUsersData([]);
        setCurrentUserRole(null); 
        setDashboardError(null); 
        return;
      }
      
      setIsLoadingDashboardData(true);
      setDashboardError(null); 
      const { role, effectiveTechnicianId: mappedTechId } = mapFirebaseUserToAppRoleAndId(user);
      setCurrentUserRole(role);
      setEffectiveTechnicianId(mappedTechId);

      try {
        let reportsToSetForDashboard: FieldReport[] = [];
        if (role === 'ADMIN' || role === 'SUPERVISOR') {
          const [reports, projects, usersList] = await Promise.all([
            getAllReports(),
            getProjects(),
            getUsers()
          ]);
          reportsToSetForDashboard = reports;
          setAllReportsData(reports);
          setAllProjectsData(projects);
          setAllUsersData(usersList);
        } else if (role === 'TECHNICIAN' && mappedTechId) {
          reportsToSetForDashboard = await getReportsByTechnicianId(mappedTechId);
          setTechnicianReports(reportsToSetForDashboard);
          setAllReportsData(reportsToSetForDashboard); 
          setAllProjectsData([]);
          setAllUsersData([]);
        } else if (role === 'TECHNICIAN' && !mappedTechId) {
           setTechnicianReports([]);
           setAllReportsData([]);
           setAllProjectsData([]);
           setAllUsersData([]);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setDashboardError((err as Error).message || "Failed to load report data for dashboard.");
      } finally {
        setIsLoadingDashboardData(false);
      }
    };

    loadDashboardData();
  }, [user, authLoading]); 

  useEffect(() => {
    if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') {
      const fetchCompliancePrediction = async () => {
        setIsLoadingCompliance(true);
        setComplianceError(null);
        try {
          const mockHistoricalData = "Past 3 months: 85% compliance. Previous project X: 90% compliance. Project Y: 78% with similar conditions.";
          const mockCurrentConditions = "Current project: Roadway Paving. Weather: Fair, 25°C. Staffing: Full team. Material delivery: On schedule for asphalt, slight delay on aggregates. Equipment: All operational.";
          const mockValidationRules = "Asphalt PG 64-22: Temperature range 135-160°C. Density: 92-97% of Marshall. Compaction: Min 8 passes. Concrete Slump: 75-125mm.";
          
          const prediction = await predictCompliancePercentage({
            historicalData: mockHistoricalData,
            currentConditions: mockCurrentConditions,
            validationRules: mockValidationRules,
          });
          setCurrentCompliancePrediction(prediction);
        } catch (err) {
          console.error("Error fetching compliance prediction:", err);
          setComplianceError((err as Error).message || "Failed to get AI compliance prediction.");
        } finally {
          setIsLoadingCompliance(false);
        }
      };
      fetchCompliancePrediction();
    }
  }, [currentUserRole]);
  
  const adminKpiData = useMemo(() => {
    const reportsForKpi = allReportsData; 
    const predictedComplianceValue = currentCompliancePrediction?.predictedCompliancePercentage;
    const complianceTrend = currentCompliancePrediction ? (predictedComplianceValue && predictedComplianceValue > 90 ? "Improving" : "Stable") : "N/A";

    return [
        { title: "Total Reports", value: reportsForKpi.length, icon: FileText, trend: "", trendDirection: "neutral" as const }, 
        { title: "Pending Validation", value: reportsForKpi.filter(r => r.status === 'SUBMITTED').length, icon: KpiAlertTriangle, trend: "", trendDirection: "neutral" as const },
        { title: "Validated Reports", value: reportsForKpi.filter(r => r.status === 'VALIDATED').length, icon: CheckCircle, trend: "", trendDirection: "neutral" as const },
        { 
          title: "AI Predicted Compliance", 
          value: isLoadingCompliance ? "..." : (predictedComplianceValue !== undefined ? `${predictedComplianceValue.toFixed(1)}%` : "N/A"), 
          icon: Bot, 
          trend: isLoadingCompliance ? "" : (complianceError ? "Error" : complianceTrend), 
          trendDirection: complianceError ? "neutral" : (predictedComplianceValue && predictedComplianceValue > 90 ? "up" : "neutral" as const),
          description: complianceError ? complianceError : (isLoadingCompliance ? "Calculating..." : ""),
          tooltipContent: currentCompliancePrediction ? (
             <div className="text-xs p-1 max-w-xs">
                <p className="font-semibold">Reasons:</p>
                <p className="whitespace-pre-wrap mb-2">{currentCompliancePrediction.reasons}</p>
                <p className="font-semibold">Suggested Actions:</p>
                <p className="whitespace-pre-wrap">{currentCompliancePrediction.suggestedActions}</p>
             </div>
          ) : (complianceError ? <p className="text-xs">{complianceError}</p> : undefined),
        }, 
    ];
  }, [allReportsData, currentCompliancePrediction, isLoadingCompliance, complianceError]);


  const technicianKpiData = useMemo(() => [
    { title: "My Submitted Reports", value: technicianReports.filter(r => r.status !== 'DRAFT').length, icon: FileText, description: "Total reports you've submitted." },
    { title: "Pending My Review", value: technicianReports.filter(r => r.status === 'SUBMITTED' || r.status === 'REJECTED').length, icon: ListChecks, description: "Reports needing action or submitted." },
    { title: "My Validated Reports", value: technicianReports.filter(r => r.status === 'VALIDATED').length, icon: UserCheck, description: "Reports approved." },
    { title: "Reports in Draft", value: technicianReports.filter(r => r.status === 'DRAFT').length, icon: Clock, description: "Reports saved as draft." },
  ], [technicianReports]);
  
  const sortedTechnicianReportsForDisplay = useMemo(() => {
    return [...technicianReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [technicianReports]);

  const materialUsageData = useMemo(() => {
    const reportsSource = (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') ? allReportsData : technicianReports;
    const counts: { [key in MaterialType | string]: number } = { cement: 0, asphalt: 0, gravel: 0, sand: 0, other: 0 }; 
    reportsSource.forEach(report => {
      if (counts[report.materialType] !== undefined) {
        counts[report.materialType]++;
      } else {
        counts.other++; 
      }
    });
    return Object.entries(counts).map(([material, reportCount]) => ({
      material: material.charAt(0).toUpperCase() + material.slice(1), 
      reports: reportCount,
      fill: materialColors[material as MaterialType] || materialColors.other,
    }));
  }, [allReportsData, technicianReports, currentUserRole]);

  const supplierUsageData = useMemo(() => {
    const reportsSource = (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') ? allReportsData : technicianReports;
    const supplierCounts: { [key: string]: number } = {};
    reportsSource.forEach(report => {
      const supplier = report.supplier || "Unknown Supplier";
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
        name: 'Other Suppliers',
        reports: otherCount,
        fill: supplierChartColors[4], 
      });
    }
    return chartData;
  }, [allReportsData, technicianReports, currentUserRole]);

  const filteredProjectsForAssignments = useMemo(() => {
    const selectedRangeFrom = dateRange?.from ? startOfDay(dateRange.from) : null;
    const selectedRangeTo = dateRange?.to ? endOfDay(dateRange.to) : selectedRangeFrom ? endOfDay(selectedRangeFrom) : null;
  
    // If range is not properly set (e.g. cleared, or initial state issue), default to today
    const effectiveRangeFrom = selectedRangeFrom || startOfDay(new Date());
    const effectiveRangeTo = selectedRangeTo || endOfDay(new Date());

    return allProjectsData
      .filter(p => {
        if (p.status === 'COMPLETED' || p.status === 'INACTIVE') return false;
        if (!p.startDate) return false; // Must have a start date
  
        const projectStart = startOfDay(parseISO(p.startDate));
        const projectEnd = p.endDate ? endOfDay(parseISO(p.endDate)) : null;
  
        if (projectEnd) { // Project has a defined start and end date
          // Check for overlap: projectStart <= effectiveRangeTo AND projectEnd >= effectiveRangeFrom
          return !(isAfter(projectStart, effectiveRangeTo) || isBefore(projectEnd, effectiveRangeFrom));
        } else { // Project is ongoing (no end date)
          // Overlap if it starts before or during the range's end: projectStart <= effectiveRangeTo
          return !isAfter(projectStart, effectiveRangeTo);
        }
      })
      .sort((a, b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));
  }, [allProjectsData, dateRange]);


  if (authLoading || isLoadingDashboardData) { 
    return (
      <>
        <PageTitle title="Dashboard Overview" icon={LayoutDashboard} subtitle="Loading your personalized insights..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
        {(currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (
          <>
            <Skeleton className="h-16 w-full mb-6 rounded-lg" /> {/* Date Picker Placeholder */}
            <Skeleton className="h-72 w-full mb-6 rounded-lg" /> {/* Alerts Placeholder */}
            <Skeleton className="h-96 w-full mb-6 rounded-lg" /> {/* Assignments Placeholder */}
          </>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </>
    );
  }
  
  if (!user && !authLoading) { 
     return (
      <>
        <PageTitle title="Dashboard" icon={LayoutDashboard} subtitle="Please log in to view your dashboard." />
         <div className="text-center py-10">
            <p className="text-muted-foreground">You need to be logged in to access this page.</p>
            <Button asChild className="mt-4 rounded-lg">
              <Link href="/auth/login">Login</Link>
            </Button>
          </div>
      </>
    );
  }
  
  if (dashboardError) {
    return (
      <>
        <PageTitle title="Dashboard Error" icon={KpiAlertTriangle} subtitle="Could not load dashboard data." />
        <Card>
            <CardHeader><CardTitle>Error Details</CardTitle></CardHeader>
            <CardContent>
                <p className="text-destructive">{dashboardError}</p>
                <Button onClick={() => window.location.reload()} className="mt-4 rounded-lg">Try Reloading</Button>
            </CardContent>
        </Card>
      </>
    )
  }

  if (user && currentUserRole === null && !isLoadingDashboardData) {
     return ( 
      <>
        <PageTitle title="Dashboard Overview" icon={LayoutDashboard} subtitle="Finalizing dashboard..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      </>
    );
  }

  const noReportsExistForUser = (currentUserRole === 'TECHNICIAN' && technicianReports.length === 0) ||
                               ((currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && allReportsData.length === 0);
  
  const noProjectsExistForAdmin = (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && allProjectsData.length === 0;


  return (
    <TooltipProvider>
      <PageTitle
        title={currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' ? "Dashboard Overview" : "My Dashboard"}
        icon={LayoutDashboard}
        subtitle={currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' ? "Key metrics and insights for your projects." : "Your personal report summary and activity."}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <FileText className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
        }
      />

      { (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (
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
                            isSameDay(dateRange.from, new Date()) && isSameDay(dateRange.to, new Date()) ? "Aujourd'hui" :
                            `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                        ) : (
                            isSameDay(dateRange.from, new Date()) ? "Aujourd'hui" : format(dateRange.from, "LLL dd, y")
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
                    />
                    </PopoverContent>
                </Popover>
                <Button 
                    variant="ghost" 
                    onClick={() => setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) })}
                    className="w-full sm:w-auto"
                    disabled={dateRange?.from && isSameDay(dateRange.from, new Date()) && dateRange.to && isSameDay(dateRange.to, new Date())}
                >
                    Aujourd'hui
                </Button>
            </CardContent>
          </Card>


          {isLoadingDashboardData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Skeleton className="h-72 rounded-lg" />
              <Skeleton className="h-96 rounded-lg" />
            </div>
          ) : noProjectsExistForAdmin ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center"><HardHat className="mr-2 h-5 w-5 text-muted-foreground" />No Projects Found</CardTitle>
                <CardDescription>There are currently no projects in the system to display project-related overviews or alerts.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>You can start by <Link href="/admin/projects" className="text-primary hover:underline">adding new projects</Link>.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"> {/* Changed to lg:grid-cols-3 */}
              <AlertsCard projects={allProjectsData} users={allUsersData} /> {/* Occupies 1 column */}
              <ProjectAssignmentsCard projects={filteredProjectsForAssignments} users={allUsersData} /> {/* Occupies 2 columns (defined in its own class) */}
            </div>
          )}
          
          {noReportsExistForUser && !isLoadingDashboardData && !dashboardError && !noProjectsExistForAdmin && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>No Reports Found</CardTitle>
                <CardDescription>There are currently no reports in the system to display related charts.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>You can start by <Link href="/reports/create" className="text-primary hover:underline">creating a new report</Link>.</p>
              </CardContent>
            </Card>
          )}

          {!noReportsExistForUser && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                <MaterialReportsChart data={materialUsageData} />
                </div>
                <div>
                <SupplierUsageChart data={supplierUsageData} />
                </div>
                <ComplianceTrendChart />
                <ActivityLog />
            </div>
          )}
        </>
      )}

      { currentUserRole === 'TECHNICIAN' && (
        <>
         {noReportsExistForUser && !isLoadingDashboardData && !dashboardError && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>No Reports Found</CardTitle>
                <CardDescription>You have not submitted any reports yet, or there are no reports matching the current view.</CardDescription>
              </CardHeader>
              <CardContent>
                 <p>You can start by <Link href="/reports/create" className="text-primary hover:underline">creating a new report</Link>.</p>
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
                    <CardTitle>My Recent Reports (Last 5)</CardTitle>
                    <CardDescription>Quick overview of your latest activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    {sortedTechnicianReportsForDisplay.length > 0 ? sortedTechnicianReportsForDisplay.slice(0, 5).map(report => (
                    <div key={report.id} className="mb-3 pb-3 border-b last:border-b-0 last:pb-0 last:mb-0">
                        <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-xs" title={`Report ${report.id} for ${report.projectId}`}>Report {report.id.substring(0,6)}... ({report.projectId})</span>
                        <Badge variant={reportStatusBadgeVariant[report.status]}>{report.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                        {(materialTypeDisplay[report.materialType] || report.materialType)} - {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                    )) : <p className="text-sm text-muted-foreground">No reports submitted yet.</p>}
                </CardContent>
                </Card>
                <Card className="lg:col-span-1 shadow-lg rounded-lg">
                <CardHeader>
                    <CardTitle>My Material Usage</CardTitle>
                    <CardDescription>Breakdown of materials in your reports.</CardDescription>
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
                        <RechartsTooltip formatter={(value, name) => [`${value} reports`, name as string]}/>
                        <RechartsLegend wrapperStyle={{ fontSize: '12px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                    <p className="text-sm text-muted-foreground text-center">No material data to display.</p>
                    )}
                </CardContent>
                </Card>
                <div className="lg:col-span-1">
                <Card className="shadow-lg rounded-lg h-full">
                    <CardHeader><CardTitle>Reminders & Alerts</CardTitle>
                    <CardDescription>Important action items or system notices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {technicianReports.filter(r => r.status === 'REJECTED').length > 0 && (
                            <div className="mb-3 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
                                <p className="text-sm text-destructive font-medium">You have {technicianReports.filter(r => r.status === 'REJECTED').length} rejected report(s) needing attention.</p>
                            </div>
                        )}
                        {technicianReports.filter(r => r.status === 'DRAFT').length > 0 && (
                            <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                <p className="text-sm text-amber-700 font-medium">You have {technicianReports.filter(r => r.status === 'DRAFT').length} report(s) in draft.</p>
                            </div>
                        )}
                        {(technicianReports.filter(r => r.status === 'REJECTED').length === 0 && technicianReports.filter(r => r.status === 'DRAFT').length === 0) && (
                            <p className="text-muted-foreground text-sm">No urgent reminders currently.</p>
                        )}
                    </CardContent>
                </Card>
                </div>
            </div>
            </>
          )}
        </>
      )}
    </TooltipProvider>
  );
}

