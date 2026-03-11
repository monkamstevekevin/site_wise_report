'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, X, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  description: string;
  href: string;
  done: boolean;
}

interface OnboardingChecklistProps {
  hasProjects: boolean;
  hasTeamMembers: boolean;
  hasReports: boolean;
}

export function OnboardingChecklist({ hasProjects, hasTeamMembers, hasReports }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  const steps: Step[] = [
    {
      label: 'Créer votre premier projet',
      description: 'Ajoutez un chantier pour organiser vos rapports.',
      href: '/admin/projects',
      done: hasProjects,
    },
    {
      label: 'Inviter un technicien',
      description: 'Partagez le lien d\'invitation depuis Paramètres.',
      href: '/settings',
      done: hasTeamMembers,
    },
    {
      label: 'Soumettre un premier rapport',
      description: 'Créez un rapport de terrain pour tester le workflow complet.',
      href: '/reports/create',
      done: hasReports,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Rocket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Démarrez en 3 étapes</CardTitle>
              <CardDescription>
                {completedCount} / {steps.length} complétées — votre organisation est presque prête !
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-blue-100">
          <div
            className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.done ? '#' : step.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                step.done
                  ? 'cursor-default opacity-60'
                  : 'hover:bg-blue-100/60 cursor-pointer'
              )}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-blue-300 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', step.done && 'line-through text-muted-foreground')}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
              {!step.done && <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
