
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { GanttChartSquare } from 'lucide-react';

interface MaterialReportData {
  material: string; // Expect already translated material name from page.tsx
  reports: number;
  fill: string;
}

interface MaterialReportsChartProps {
  data: MaterialReportData[];
}

const chartConfig = {
  reports: {
    label: 'Rapports',
  },
  // Material names will come from the data and legend will use nameKey="material"
} satisfies ChartConfig;

export function MaterialReportsChart({ data }: MaterialReportsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
            Rapports par Type de Matériau
          </CardTitle>
          <CardDescription>Répartition des rapports soumis par catégorie de matériau.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Aucune donnée de rapport de matériau disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
          Rapports par Type de Matériau
        </CardTitle>
        <CardDescription>Répartition des rapports soumis par catégorie de matériau.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="material" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                            formatter={(value, name, props) => [`${value} rapports`, props.payload.material]} 
                            hideLabel 
                        />}
              />
              <Bar dataKey="reports" radius={5} />
               <ChartLegend content={<ChartLegendContent nameKey="material"/>} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
