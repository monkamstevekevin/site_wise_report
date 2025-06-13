
import { PageTitle } from '@/components/common/PageTitle';
import { KpiCard } from './components/KpiCard';
import { FileText, CheckCircle, AlertTriangle, BarChart3, LayoutDashboard, GanttChartSquare, Users2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


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
        <Card className="lg:col-span-2 shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
              Reports by Material Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md">
              {/* Placeholder for Reports by Material Chart */}
              <p>Chart: Breakdown of submitted reports by material (e.g., Cement, Asphalt). (Coming Soon)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users2 className="mr-2 h-5 w-5 text-primary" />
              Supplier Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
           <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md">
            {/* Placeholder for Supplier Usage Pie Chart */}
             <p>Chart: Distribution of reports by supplier. (Coming Soon)</p>
           </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5 text-primary" />
             AI Compliance Prediction Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
           <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md">
            {/* Placeholder for Compliance % Over Time Chart */}
            <p>Chart: Trend of AI-predicted compliance percentages over time. (Coming Soon)</p>
           </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 shadow-lg rounded-lg">
           <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Weekly Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
           <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md">
            {/* Placeholder for Weekly Activity Log */}
             <p>List/Timeline: Recent activities like report submissions, validations. (Coming Soon)</p>
           </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
