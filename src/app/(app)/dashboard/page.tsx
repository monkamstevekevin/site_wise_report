
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle, BarChart3, LayoutDashboard, ListChecks, UserCheck, Clock, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';
import { useAuth } from '@/contexts/AuthContext'; 
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';
import type { FieldReport } from '@/lib/types';
import { getReportsByTechnicianId, getReports as getAllReports } from '@/services/reportService'; 
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

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
  // Keep these generic ones for broader testing if needed.
  if (firebaseUser.email?.includes('admin@example.com')) return { role: 'ADMIN', effectiveTechnicianId: null };
  if (firebaseUser.email?.includes('supervisor@example.com')) return { role: 'SUPERVISOR', effectiveTechnicianId: null };
  
  // Default to using Firebase UID as technicianId for other users.
  return { role: 'TECHNICIAN', effectiveTechnicianId: firebaseUser.uid }; 
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
};

const materialColors: { [key: string]: string } = {
  cement: 'hsl(var(--chart-1))',
  asphalt: 'hsl(var(--chart-2))',
  gravel: 'hsl(var(--chart-3))',
  sand: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [effectiveTechnicianId, setEffectiveTechnicianId] = useState<string | null>(null);
  
  const [allReportsData, setAllReportsData] = useState<FieldReport[]>([]);
  const [technicianReports, setTechnicianReports] = useState<FieldReport[]>([]);
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (authLoading) { // Only wait for authLoading, not !user initially
        setIsLoadingDashboardData(true); // Ensure loading state is true while auth is resolving
        return;
      }
      
      if (!user) { // If auth is done and there's no user
        setIsLoadingDashboardData(false);
        setAllReportsData([]);
        setTechnicianReports([]);
        setCurrentUserRole(null); // Clear role
        setDashboardError(null); // Clear any previous errors
        return;
      }
      
      setIsLoadingDashboardData(true);
      setDashboardError(null); // Reset error at the start of a new fetch attempt
      const { role, effectiveTechnicianId: mappedTechId } = mapFirebaseUserToAppRoleAndId(user);
      setCurrentUserRole(role);
      setEffectiveTechnicianId(mappedTechId);

      try {
        let reports: FieldReport[] = [];
        if (role === 'ADMIN' || role === 'SUPERVISOR') {
          reports = await getAllReports();
          setAllReportsData(reports);
        } else if (role === 'TECHNICIAN' && mappedTechId) {
          reports = await getReportsByTechnicianId(mappedTechId);
          setTechnicianReports(reports);
          setAllReportsData(reports); 
        } else if (role === 'TECHNICIAN' && !mappedTechId) {
          // Technician role but no specific ID to fetch for (e.g. new user not yet in a custom system)
           setTechnicianReports([]);
           setAllReportsData([]);
        }
        // Note: reportService now returns [] for missing indexes, so no error will be thrown for that.
        // dashboardError will only be set if reportService throws a *different* type of error.
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        // This error will only be set for actual service failures, not missing indexes.
        setDashboardError((err as Error).message || "Failed to load report data for dashboard.");
      } finally {
        setIsLoadingDashboardData(false);
      }
    };

    loadDashboardData();
  }, [user, authLoading]); // Dependencies
  
  const adminKpiData = useMemo(() => [
    { title: "Total Reports", value: allReportsData.length, icon: FileText, trend: "+X% from last month" , trendDirection: "up" as const }, 
    { title: "Pending Validation", value: allReportsData.filter(r => r.status === 'SUBMITTED').length, icon: AlertTriangle, trend: "-Y since yesterday", trendDirection: "down" as const },
    { title: "Validated Reports", value: allReportsData.filter(r => r.status === 'VALIDATED').length, icon: CheckCircle, trend: "+Z this week", trendDirection: "up" as const },
    { title: "Avg. Compliance", value: "XX%", icon: BarChart3, trend: "Maintained", trendDirection: "neutral" as const }, // Needs actual calculation
  ], [allReportsData]);


  const technicianKpiData = useMemo(() => [
    { title: "My Submitted Reports", value: technicianReports.filter(r => r.status !== 'DRAFT').length, icon: FileText, description: "Total reports you've submitted." },
    { title: "Pending My Review", value: technicianReports.filter(r => r.status === 'SUBMITTED' || r.status === 'REJECTED').length, icon: ListChecks, description: "Reports needing action or submitted." },
    { title: "My Validated Reports", value: technicianReports.filter(r => r.status === 'VALIDATED').length, icon: UserCheck, description: "Reports approved." },
    { title: "Reports in Draft", value: technicianReports.filter(r => r.status === 'DRAFT').length, icon: Clock, description: "Reports saved as draft." },
  ], [technicianReports]);
  
  const sortedTechnicianReportsForDisplay = useMemo(() => {
    return [...technicianReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [technicianReports]);

  const technicianMaterialUsage = useMemo(() => {
    const counts: { [key: string]: number } = {};
    technicianReports.forEach(report => {
      counts[report.materialType] = (counts[report.materialType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value,
      fill: materialColors[name.toLowerCase()] || 'hsl(var(--muted))',
    }));
  }, [technicianReports]);


  if (authLoading || isLoadingDashboardData) { 
    return (
      <>
        <PageTitle title="Dashboard Overview" icon={LayoutDashboard} subtitle="Loading your personalized insights..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </>
    );
  }
  
  if (!user && !authLoading) { // Explicitly check for no user after auth is done loading
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
  
  // This block will now only show for actual fetch errors, not missing indexes.
  if (dashboardError) {
    return (
      <>
        <PageTitle title="Dashboard Error" icon={AlertTriangleIcon} subtitle="Could not load dashboard data." />
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

  // If no error, and loading is false, but user is present and role might still be resolving briefly
  if (user && currentUserRole === null && !isLoadingDashboardData) {
     return ( // Simplified loading state if role isn't set yet but data fetch might be "done" (e.g. empty)
      <>
        <PageTitle title="Dashboard Overview" icon={LayoutDashboard} subtitle="Finalizing dashboard..." />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      </>
    );
  }

  return (
    <>
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
          {allReportsData.length === 0 && !isLoadingDashboardData && !dashboardError && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>No Reports Found</CardTitle>
                <CardDescription>There are currently no reports in the system to display on the dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>You can start by <Link href="/reports/create" className="text-primary hover:underline">creating a new report</Link>.</p>
              </CardContent>
            </Card>
          )}
          {allReportsData.length > 0 && (
            <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {adminKpiData.map((kpi) => (
                <KpiCard
                    key={kpi.title}
                    title={kpi.title}
                    value={kpi.value}
                    icon={kpi.icon}
                    trend={kpi.trend}
                    trendDirection={kpi.trendDirection}
                />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                <MaterialReportsChart />
                </div>
                <div>
                <SupplierUsageChart />
                </div>
                <ComplianceTrendChart />
                <ActivityLog />
            </div>
            </>
          )}
        </>
      )}

      { currentUserRole === 'TECHNICIAN' && (
        <>
         {technicianReports.length === 0 && !isLoadingDashboardData && !dashboardError && (
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
          {technicianReports.length > 0 && (
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
                        {report.materialType.charAt(0).toUpperCase() + report.materialType.slice(1)} - {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
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
                    {technicianMaterialUsage.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie data={technicianMaterialUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {technicianMaterialUsage.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} reports`, name]}/>
                        <Legend wrapperStyle={{ fontSize: '12px' }}/>
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
    </>
  );
}
