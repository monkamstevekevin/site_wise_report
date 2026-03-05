
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { FieldReport } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const materialTypeDisplay: Record<string, string> = {
  cement:  'Ciment',
  asphalt: 'Asphalte',
  gravel:  'Gravier',
  sand:    'Sable',
  other:   'Autre',
};

const statusConfig = {
  VALIDATED: {
    icon: CheckCircle,
    bgClass: 'bg-green-500',
    label: 'Rapport validé',
    badgeVariant: 'default' as const,
  },
  REJECTED: {
    icon: XCircle,
    bgClass: 'bg-destructive',
    label: 'Rapport rejeté',
    badgeVariant: 'destructive' as const,
  },
  SUBMITTED: {
    icon: Send,
    bgClass: 'bg-blue-500',
    label: 'Rapport soumis',
    badgeVariant: 'secondary' as const,
  },
  DRAFT: {
    icon: Clock,
    bgClass: 'bg-gray-400',
    label: 'Brouillon sauvegardé',
    badgeVariant: 'outline' as const,
  },
};

interface ActivityLogProps {
  reports: FieldReport[];
}

export function ActivityLog({ reports }: ActivityLogProps) {
  const sorted = [...reports]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5 text-primary" />
          Activité Récente
        </CardTitle>
        <CardDescription>Les 10 dernières mises à jour de rapports.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 pr-4">
          <div className="space-y-3">
            {sorted.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Aucune activité récente.</p>
            )}
            {sorted.map((report) => {
              const cfg = statusConfig[report.status] ?? statusConfig.SUBMITTED;
              const Icon = cfg.icon;
              const material = materialTypeDisplay[report.materialType] || report.materialType;
              return (
                <div
                  key={report.id}
                  className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${cfg.bgClass}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{cfg.label}</p>
                      <Badge variant={cfg.badgeVariant} className="text-xs shrink-0">
                        {report.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {material} — Lot {report.batchNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
