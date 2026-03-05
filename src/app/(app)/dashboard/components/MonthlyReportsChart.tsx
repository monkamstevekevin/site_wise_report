
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';

export interface MonthlyReportData {
  label: string;
  validés: number;
  rejetés: number;
  soumis: number;
}

interface MonthlyReportsChartProps {
  data: MonthlyReportData[];
}

const chartConfig = {
  validés:  { label: 'Validés',      color: 'hsl(142, 71%, 45%)' },
  rejetés:  { label: 'Rejetés',      color: 'hsl(var(--destructive))' },
  soumis:   { label: 'En attente',   color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

export function MonthlyReportsChart({ data }: MonthlyReportsChartProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" />
          Rapports par Mois
        </CardTitle>
        <CardDescription>Évolution mensuelle des soumissions sur les 6 derniers mois.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="validés" fill="var(--color-validés)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejetés" fill="var(--color-rejetés)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="soumis"  fill="var(--color-soumis)"  radius={[4, 4, 0, 0]} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
