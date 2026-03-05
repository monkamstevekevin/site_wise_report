'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Project, User } from '@/lib/types';
import {
  HardHat, AlertTriangle, CalendarDays, Users,
  MapPin, ArrowRight, CheckCircle2, Clock, PauseCircle,
} from 'lucide-react';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ProjectAssignmentsCardProps {
  projects: Project[];
  users: User[];
}

const getAssignedTechniciansCount = (projectId: string, users: User[]): number => {
  if (!Array.isArray(users)) return 0;
  return users.filter(
    u => u.role === 'TECHNICIAN' &&
    Array.isArray(u.assignments) &&
    u.assignments.some(a => a.projectId === projectId)
  ).length;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  try {
    const d = parseISO(dateString);
    return isValid(d) ? format(d, 'd MMM yy', { locale: fr }) : 'N/D';
  } catch { return 'N/D'; }
};

const getProgress = (startDate?: string, endDate?: string): number => {
  if (!startDate || !endDate) return 0;
  try {
    const start = parseISO(startDate).getTime();
    const end = parseISO(endDate).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  } catch { return 0; }
};

const STATUS = {
  ACTIVE:    { label: 'Actif',    icon: Clock,         accent: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800' },
  INACTIVE:  { label: 'Inactif', icon: PauseCircle,   accent: 'bg-slate-400',   pill: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:ring-slate-700' },
  COMPLETED: { label: 'Terminé', icon: CheckCircle2,  accent: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800' },
} as const;

export function ProjectAssignmentsCard({ projects, users }: ProjectAssignmentsCardProps) {
  const now = new Date();
  const router = useRouter();

  if (!Array.isArray(projects) || projects.length === 0) {
    return (
      <Card className="shadow-lg rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-5 w-5 text-primary" /> Aperçu des Projets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <HardHat className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun projet pour la période sélectionnée.</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/projects')}>
            Gérer les projets
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="h-5 w-5 text-primary" /> Aperçu des Projets
          </CardTitle>
          <CardDescription className="mt-0.5">
            {projects.length} projet{projects.length > 1 ? 's' : ''} actifs
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/projects')}
          className="text-primary hover:text-primary shrink-0 gap-1"
        >
          Voir tout <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map(project => {
            const techCount = getAssignedTechniciansCount(project.id, users);
            const cfg = STATUS[project.status as keyof typeof STATUS] ?? STATUS.INACTIVE;
            const StatusIcon = cfg.icon;
            const progress = project.status === 'ACTIVE' ? getProgress(project.startDate, project.endDate) : project.status === 'COMPLETED' ? 100 : 0;

            let daysUntilStart: number | null = null;
            if (project.startDate) {
              const parsed = parseISO(project.startDate);
              if (isValid(parsed)) daysUntilStart = differenceInDays(parsed, now);
            }
            const alertNeeded =
              (project.status === 'ACTIVE' && techCount === 0) ||
              (daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 7 && techCount === 0);

            return (
              <div
                key={project.id}
                onClick={() => router.push('/admin/projects')}
                className={cn(
                  'relative flex flex-col rounded-xl border cursor-pointer transition-all duration-200',
                  'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]',
                  alertNeeded
                    ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-700/50'
                    : 'border-border/70 bg-card hover:border-primary/25'
                )}
              >
                {/* Accent top bar */}
                <div className={cn('h-1 w-full rounded-t-xl', cfg.accent)} />

                <div className="p-4 flex flex-col gap-3 flex-1">

                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1 text-foreground">
                      {project.name}
                    </h3>
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                      cfg.pill
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{project.location}</span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span>{formatDate(project.startDate)}</span>
                    <span className="text-muted-foreground/40">→</span>
                    <span>{formatDate(project.endDate)}</span>
                  </div>

                  {/* Progress bar (only for ACTIVE) */}
                  {project.status === 'ACTIVE' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Avancement</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Footer */}
                  <div className={cn(
                    'flex items-center justify-between pt-3 border-t',
                    alertNeeded ? 'border-amber-200 dark:border-amber-800/40' : 'border-border/50'
                  )}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold',
                        techCount === 0
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary'
                      )}>
                        {techCount}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>technicien{techCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {alertNeeded && (
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="hidden sm:inline">Requis</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
