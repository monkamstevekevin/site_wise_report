
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { GanttChartSquare } from 'lucide-react';

interface MaterialReportData {
  material: string;
  reports: number;
  fill: string;
}

interface MaterialReportsChartProps {
  data: MaterialReportData[];
}

// This chartConfig is now mainly for Legend labels and general setup,
// as colors are driven by the 'fill' property in the incoming data.
const chartConfig = {
  reports: {
    label: 'Reports',
  },
  // The keys here (cement, asphalt, etc.) should match the 'material' names
  // from the data if we want the legend to pick them up automatically.
  // However, the legend can also be built dynamically or use nameKey from data.
  Cement: { label: 'Cement', color: 'hsl(var(--chart-1))' },
  Asphalt: { label: 'Asphalt', color: 'hsl(var(--chart-2))' },
  Gravel: { label: 'Gravel', color: 'hsl(var(--chart-3))' },
  Sand: { label: 'Sand', color: 'hsl(var(--chart-4))' },
  Other: { label: 'Other', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

export function MaterialReportsChart({ data }: MaterialReportsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <GanttChartSquare className="mr-2 h-5 w-5 text-primary" />
            Reports by Material Type
          </CardTitle>
          <CardDescription>Breakdown of submitted reports by material category.</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No material report data available.</p>
        </CardContent>
      </Card>
    );
  }

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
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="material" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                            formatter={(value, name, props) => [`${value} reports`, props.payload.material]} 
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

    