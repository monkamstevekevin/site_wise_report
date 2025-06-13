
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { GanttChartSquare } from 'lucide-react';

const chartData = [
  { material: 'Cement', reports: 186, fill: 'var(--color-cement)' },
  { material: 'Asphalt', reports: 120, fill: 'var(--color-asphalt)' },
  { material: 'Gravel', reports: 95, fill: 'var(--color-gravel)' },
  { material: 'Sand', reports: 73, fill: 'var(--color-sand)' },
  { material: 'Other', reports: 45, fill: 'var(--color-other)' },
];

const chartConfig = {
  reports: {
    label: 'Reports',
  },
  cement: {
    label: 'Cement',
    color: 'hsl(var(--chart-1))',
  },
  asphalt: {
    label: 'Asphalt',
    color: 'hsl(var(--chart-2))',
  },
  gravel: {
    label: 'Gravel',
    color: 'hsl(var(--chart-3))',
  },
  sand: {
    label: 'Sand',
    color: 'hsl(var(--chart-4))',
  },
  other: {
    label: 'Other',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export function MaterialReportsChart() {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
          Reports by Material Type
        </CardTitle>
        <CardDescription>Breakdown of submitted reports by material category.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="material" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey="reports" radius={5} />
               <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
