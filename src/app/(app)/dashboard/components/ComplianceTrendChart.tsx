
'use client';

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bot } from 'lucide-react';

const chartData = [
  { month: 'Jan', "AI Predicted Compliance": 88 },
  { month: 'Fév', "AI Predicted Compliance": 90 }, // Translated
  { month: 'Mar', "AI Predicted Compliance": 89 },
  { month: 'Avr', "AI Predicted Compliance": 92 }, // Translated
  { month: 'Mai', "AI Predicted Compliance": 93 },
  { month: 'Juin', "AI Predicted Compliance": 91 }, // Translated
];

const chartConfig = {
  compliance: {
    label: 'Conformité Prédite par IA (%)', // Translated
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export function ComplianceTrendChart() {
  return (
    <Card className="shadow-lg rounded-lg lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-5 w-5 text-primary" />
          Tendances de Prédiction de Conformité IA
        </CardTitle>
        <CardDescription>Tendance mensuelle des pourcentages de conformité prédits par l'IA.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                domain={[80, 100]} 
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(value, payload) => {
                        if (payload && payload.length > 0) {
                            return `Mois : ${payload[0].payload.month}`; // Translated
                        }
                        return value;
                    }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                }
              />
              <Line
                dataKey="AI Predicted Compliance"
                type="monotone"
                stroke="var(--color-compliance)"
                strokeWidth={2}
                dot={{
                  fill: 'var(--color-compliance)',
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
