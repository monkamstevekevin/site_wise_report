
import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle, BarChart3, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MaterialReportsChart } from './components/MaterialReportsChart';
import { SupplierUsageChart } from './components/SupplierUsageChart';
import { ComplianceTrendChart } from './components/ComplianceTrendChart';
import { ActivityLog } from './components/ActivityLog';

const kpiData = [
  { title: "Total Reports", value: 1256, icon: FileText, trend: "+20.1% from last month" , trendDirection: "up" as const },
  { title: "Pending Validation", value: 78, icon: AlertTriangle, trend: "-5 since yesterday", trendDirection: "down" as const },
  { title: "Validated Reports", value: 1100, icon: CheckCircle, trend: "+15 this week", trendDirection: "up" as const },
  { title: "Avg. Compliance", value: "92%", icon: BarChart3, trend: "Maintained", trendDirection: "neutral" as const },
];

export default function DashboardPage() {
  return (
    <>
      <PageTitle
        title="Dashboard Overview"
        icon={LayoutDashboard}
        subtitle="Key metrics and insights for your projects."
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <FileText className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiData.map((kpi) => (
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
  );
}
