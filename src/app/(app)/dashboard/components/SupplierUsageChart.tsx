
'use client';

import { PieChart, Pie, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Users2 } from 'lucide-react';

const chartData = [
  { name: 'Acme Materials', reports: 275, fill: 'var(--color-acme)' },
  { name: 'BuildIt Co.', reports: 180, fill: 'var(--color-buildit)' },
  { name: 'RockSolid Inc.', reports: 150, fill: 'var(--color-rocksolid)' },
  { name: 'Quality Aggregates', reports: 90, fill: 'var(--color-quality)' },
];

const chartConfig = {
  reports: {
    label: 'Reports',
  },
  acme: {
    label: 'Acme Materials',
    color: 'hsl(var(--chart-1))',
  },
  buildit: {
    label: 'BuildIt Co.',
    color: 'hsl(var(--chart-2))',
  },
  rocksolid: {
    label: 'RockSolid Inc.',
    color: 'hsl(var(--chart-3))',
  },
  quality: {
    label: 'Quality Aggregates',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

export function SupplierUsageChart() {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users2 className="mr-2 h-5 w-5 text-primary" />
          Supplier Usage
        </CardTitle>
        <CardDescription>Distribution of reports based on material suppliers.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="reports"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                labelLine={false}
                // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                verticalAlign="bottom"
                align="center"
                iconSize={10}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
