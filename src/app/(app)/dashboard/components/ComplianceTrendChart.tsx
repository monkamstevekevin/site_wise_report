
'use client';

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ShieldCheck } from 'lucide-react';

export interface MonthlyComplianceData {
  label: string;
  conformité: number;
}

interface ComplianceTrendChartProps {
  data: MonthlyComplianceData[];
}

const chartConfig = {
  conformité: {
    label: 'Taux de Conformité (%)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function ComplianceTrendChart({ data }: ComplianceTrendChartProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
          Taux de Conformité Mensuel
        </CardTitle>
        <CardDescription>Pourcentage de rapports validés sur les 6 derniers mois.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value}%`, 'Conformité']}
                  />
                }
              />
              <Line
                dataKey="conformité"
                type="monotone"
                stroke="var(--color-conformité)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-conformité)', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
