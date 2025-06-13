
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle, BarChart3, LayoutDashboard, ListChecks, UserCheck, ClockHistory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';
import { useAuth } from '@/contexts/AuthContext'; // For role-based rendering
import type { UserRole } from '@/lib/constants'; // Assuming UserRole is defined here or in types
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useMemo } from 'react';
import type { FieldReport } from '@/lib/types'; // Assuming FieldReport type
import { mockReportsData } from '@/app/(app)/reports/page'; // For technician data
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';


// Mock mapping for user role (replace with actual role from useAuth if available and more structured)
const mapFirebaseUserToAppRole = (firebaseUser: any): UserRole => {
  if (!firebaseUser) return 'TECHNICIAN';
  if (firebaseUser.email?.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email?.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
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


// Admin/Supervisor specific KPIs
const adminKpiData = [
  { title: "Total Reports", value: 1256, icon: FileText, trend: "+20.1% from last month" , trendDirection: "up" as const },
  { title: "Pending Validation", value: 78, icon: AlertTriangle, trend: "-5 since yesterday", trendDirection: "down" as const },
  { title: "Validated Reports", value: 1100, icon: CheckCircle, trend: "+15 this week", trendDirection: "up" as const },
  { title: "Avg. Compliance", value: "92%", icon: BarChart3, trend: "Maintained", trendDirection: "neutral" as const },
];


export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [technicianReports, setTechnicianReports] = useState<FieldReport[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      setCurrentUserRole(mapFirebaseUserToAppRole(user));
      setTechnicianReports(mockReportsData.filter(report => report.technicianId === user.uid));
    } else if (!authLoading && !user) {
      // Handle user not logged in state for dashboard, perhaps redirect or show public view
      setCurrentUserRole('TECHNICIAN'); // Default or guest role
    }
  }, [user, authLoading]);

  const technicianKpiData = useMemo(() => [
    { title: "My Submitted Reports", value: technicianReports.length, icon: FileText, description: "Total reports you've created." },
    { title: "Pending My Review", value: technicianReports.filter(r => r.status === 'SUBMITTED' || r.status === 'REJECTED').length, icon: ListChecks, description: "Reports needing action or submitted." },
    { title: "My Validated Reports", value: technicianReports.filter(r => r.status === 'VALIDATED').length, icon: UserCheck, description: "Reports approved." },
    { title: "Reports in Draft", value: technicianReports.filter(r => r.status === 'DRAFT').length, icon: ClockHistory, description: "Reports saved as draft." },
  ], [technicianReports]);

  const technicianMaterialUsage = useMemo(() => {
    const counts: { [key: string]: number } = {};
    technicianReports.forEach(report => {
      counts[report.materialType] = (counts[report.materialType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      value,
      fill: materialColors[name] || 'hsl(var(--muted))',
    }));
  }, [technicianReports]);


  if (authLoading || currentUserRole === null) {
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

      { currentUserRole === 'TECHNICIAN' && (
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
              </CardHeader>
              <CardContent>
                {technicianReports.slice(0, 5).map(report => (
                  <div key={report.id} className="mb-3 pb-3 border-b last:border-b-0 last:pb-0 last:mb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Report {report.id.substring(0,6)}... for {report.projectId}</span>
                      <Badge variant={reportStatusBadgeVariant[report.status]}>{report.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {report.materialType} - {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {technicianReports.length === 0 && <p className="text-sm text-muted-foreground">No reports submitted yet.</p>}
              </CardContent>
            </Card>
             <Card className="lg:col-span-1 shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle>My Material Usage</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {technicianMaterialUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={technicianMaterialUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {technicianMaterialUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-10">No material data to display.</p>
                )}
              </CardContent>
            </Card>
            <div className="lg:col-span-1">
              {/* Placeholder for "Reminders" or other technician-specific content */}
               <Card className="shadow-lg rounded-lg">
                <CardHeader><CardTitle>Reminders</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground">No reminders currently.</p></CardContent>
               </Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}

