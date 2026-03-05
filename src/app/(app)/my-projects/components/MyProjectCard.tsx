'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  MessageSquare, MapPin, FileText, CalendarDays,
  Clock, CheckCircle2, PauseCircle, ArrowUpRight, BarChart3,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isValid, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MyProjectCardProps {
  project: Project;
}

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Actif',    icon: Clock,        bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800' },
  INACTIVE:  { label: 'Inactif', icon: PauseCircle,  bar: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700' },
  COMPLETED: { label: 'Terminé', icon: CheckCircle2, bar: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800' },
} as const;

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  try {
    const d = parseISO(dateString);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: fr }) : 'N/D';
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

export function MyProjectCard({ project }: MyProjectCardProps) {
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);

  const cfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.INACTIVE;
  const StatusIcon = cfg.icon;
  const progress = project.status === 'ACTIVE' ? getProgress(project.startDate, project.endDate) : project.status === 'COMPLETED' ? 100 : 0;

  let daysLeft: number | null = null;
  if (project.endDate && project.status === 'ACTIVE') {
    const end = parseISO(project.endDate);
    if (isValid(end)) daysLeft = differenceInDays(end, new Date());
  }

  return (
    <>
      <div className="group relative rounded-xl border border-border/70 bg-card overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-200 flex flex-col h-full">

        {/* Color accent top bar */}
        <div className={cn('h-1 w-full', cfg.bar)} />

        <div className="p-5 flex flex-col gap-3 flex-1">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 flex-1">
              {project.name}
            </h3>
            <span className={cn(
              'shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1',
              cfg.pill
            )}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span className="truncate">{project.location}</span>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span>{formatDate(project.startDate)}</span>
            <span className="text-muted-foreground/40">→</span>
            <span>{formatDate(project.endDate)}</span>
            {daysLeft !== null && daysLeft >= 0 && (
              <span className={cn(
                'ml-1 font-semibold',
                daysLeft <= 7 ? 'text-rose-500' : daysLeft <= 30 ? 'text-amber-500' : 'text-muted-foreground'
              )}>
                ({daysLeft}j restants)
              </span>
            )}
          </div>

          {/* Progress bar */}
          {project.status === 'ACTIVE' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Avancement</span>
                <span className="font-semibold text-foreground">{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Button size="sm" asChild className="flex-1 min-w-0 h-9 text-xs">
              <Link href={`/project/${project.id}`}>
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Statistiques
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1 min-w-0 h-9 text-xs">
              <Link href={`/reports?projectId=${project.id}`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Rapports
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-0 h-9 text-xs"
              onClick={() => setIsNavigateDialogOpen(true)}
            >
              <MapPin className="mr-1.5 h-3.5 w-3.5" /> Naviguer
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1 min-w-0 h-9 text-xs">
              <Link href={`/project/${project.id}/chat`}>
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Chat
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isNavigateDialogOpen} onOpenChange={setIsNavigateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ouvrir dans Google Maps</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous ouvrir <strong>"{project.location}"</strong> dans Google Maps ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.location)}`, '_blank');
                setIsNavigateDialogOpen(false);
              }}
              className="gap-2"
            >
              <ArrowUpRight className="h-4 w-4" /> Ouvrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
