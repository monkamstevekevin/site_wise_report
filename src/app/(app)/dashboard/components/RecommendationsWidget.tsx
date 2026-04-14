'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, AlertCircle, Info, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { AdminRecommendation, RecommendationPriority } from '@/services/recommendationService';

const PRIORITY_CONFIG: Record<RecommendationPriority, {
  icon: React.ElementType;
  badge: string;
  label: string;
  border: string;
}> = {
  HIGH:   { icon: AlertTriangle, badge: 'bg-red-50 text-red-700 border-red-200',    label: 'Urgent',  border: 'border-l-red-500' },
  MEDIUM: { icon: AlertCircle,  badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Moyen', border: 'border-l-orange-400' },
  LOW:    { icon: Info,          badge: 'bg-blue-50 text-blue-700 border-blue-200',  label: 'Info',    border: 'border-l-blue-400' },
};

export function RecommendationsWidget() {
  const [recommendations, setRecommendations] = useState<AdminRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/recommendations')
      .then(res => res.json())
      .then(data => {
        setRecommendations(Array.isArray(data) ? data.slice(0, 3) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Recommandations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Tout est en ordre !</span>
            <span className="text-green-600">Aucune action requise en ce moment.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-blue-600" />
            À faire
            <Badge variant="secondary" className="ml-1 text-xs">{recommendations.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
            <Link href="/admin/recommendations">
              Voir tout <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map(rec => {
          const cfg = PRIORITY_CONFIG[rec.priority];
          const Icon = cfg.icon;
          return (
            <Link key={rec.id} href={rec.link} className="block">
              <div className={`flex items-start gap-3 p-3 rounded-lg border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors ${cfg.border}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rec.description}</p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${cfg.badge}`}>
                  {cfg.label}
                </Badge>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
