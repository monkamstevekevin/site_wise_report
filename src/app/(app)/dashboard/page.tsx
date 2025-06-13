import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle, BarChart3, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mock data for KPIs - replace with actual data fetching
const kpiData = [
  { title: "Total Reports", value: 1256, icon: FileText, trend: "+20.1% from last month" , trendDirection: "up" as const },
  { title: "Pending Validation", value: 78, icon: AlertTriangle, trend: "-5 since yesterday", trendDirection: "down" as const },
  { title: "Validated Reports", value: 1100, icon: CheckCircle, trend: "+15 this week", trendDirection: "up" as const },
  { title: "Compliance Rate", value: "92%", icon: BarChart3, trend: "Maintained", trendDirection: "neutral" as const },
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
        <div className="lg:col-span-2 bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold font-headline text-foreground mb-4">Reports by Material</h2>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            {/* Placeholder for Reports by Material Chart */}
            Chart: Reports by Material (Coming Soon)
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold font-headline text-foreground mb-4">Supplier Usage</h2>
           <div className="h-80 flex items-center justify-center text-muted-foreground">
            {/* Placeholder for Supplier Usage Pie Chart */}
            Chart: Supplier Usage (Coming Soon)
          </div>
        </div>
        <div className="lg:col-span-3 bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold font-headline text-foreground mb-4">AI Compliance Prediction</h2>
           <div className="h-80 flex items-center justify-center text-muted-foreground">
            {/* Placeholder for Compliance % Over Time Chart */}
            Chart: Compliance % Over Time (Coming Soon)
          </div>
        </div>
        <div className="lg:col-span-3 bg-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold font-headline text-foreground mb-4">Weekly Activity Log</h2>
           <div className="h-80 flex items-center justify-center text-muted-foreground">
            {/* Placeholder for Weekly Activity Log */}
            Activity Log (Coming Soon)
          </div>
        </div>
      </div>
    </>
  );
}
