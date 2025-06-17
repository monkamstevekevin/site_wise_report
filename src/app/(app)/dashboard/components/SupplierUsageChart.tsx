
'use client';

import { PieChart, Pie, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Users2 } from 'lucide-react';

interface SupplierData {
  name: string; // Expect already translated name from page.tsx if applicable (e.g., "Other Suppliers")
  reports: number;
  fill: string;
}

interface SupplierUsageChartProps {
  data: SupplierData[];
}

const chartConfig = {
  reports: {
    label: 'Rapports',
  },
} satisfies ChartConfig;

export function SupplierUsageChart({ data }: SupplierUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users2 className="mr-2 h-5 w-5 text-primary" />
            Utilisation des Fournisseurs
          </CardTitle>
          <CardDescription>Distribution des rapports en fonction des fournisseurs de matériaux.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Aucune donnée d'utilisation des fournisseurs disponible.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users2 className="mr-2 h-5 w-5 text-primary" />
          Utilisation des Fournisseurs
        </CardTitle>
        <CardDescription>Distribution des rapports en fonction des fournisseurs de matériaux.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                            formatter={(value, name, props) => [`${value} rapports`, props.payload.name]}
                            hideLabel 
                        />}
              />
              <Pie
                data={data}
                dataKey="reports"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={60}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}-${entry.name}`} fill={entry.fill} />
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
