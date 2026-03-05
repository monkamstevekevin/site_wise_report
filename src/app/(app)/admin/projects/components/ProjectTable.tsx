'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Edit, Trash2, MoreVertical, MessageSquare,
  MapPin, AlertTriangle, CalendarDays, TestTube2,
  CheckCircle2, Clock, PauseCircle, ArrowUpRight, UserCircle2, BarChart3,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project, Material, MaterialType, User } from '@/lib/types';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProjectTableProps {
  projects: Project[];
  allMaterials: Material[];
  allUsers?: User[];
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Actif',    icon: Clock,         bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800' },
  INACTIVE:  { label: 'Inactif', icon: PauseCircle,   bar: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700' },
  COMPLETED: { label: 'Terminé', icon: CheckCircle2,  bar: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-800' },
} as const;

const MATERIAL_COLORS: Record<MaterialType, string> = {
  cement:  'bg-stone-100  text-stone-700  ring-stone-200  dark:bg-stone-800/60 dark:text-stone-300 dark:ring-stone-700',
  asphalt: 'bg-zinc-800   text-zinc-100   ring-zinc-700   dark:bg-zinc-900     dark:text-zinc-200  dark:ring-zinc-600',
  gravel:  'bg-amber-50   text-amber-700  ring-amber-200  dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800',
  sand:    'bg-yellow-50  text-yellow-700 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:ring-yellow-800',
  other:   'bg-purple-50  text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-800',
};

const MATERIAL_LABELS: Record<MaterialType, string> = {
  cement: 'Ciment', asphalt: 'Asphalte', gravel: 'Gravier', sand: 'Sable', other: 'Autre',
};

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

export function ProjectTable({ projects, allMaterials, allUsers = [], onEditProject, onDeleteProject }: ProjectTableProps) {
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const openDeleteDialog = (project: Project) => { setProjectToDelete(project); setIsDeleteDialogOpen(true); };
  const confirmDelete = () => {
    if (projectToDelete && onDeleteProject) onDeleteProject(projectToDelete.id);
    setIsDeleteDialogOpen(false);
    setProjectToDelete(null);
  };
  const handleOpenNavigateDialog = (location: string) => { setNavigationTarget(location); setIsNavigateDialogOpen(true); };
  const handleConfirmNavigation = () => {
    if (navigationTarget) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigationTarget)}`, '_blank');
    setIsNavigateDialogOpen(false);
    setNavigationTarget(null);
  };

  const getMaterial = (id: string) => allMaterials.find(m => m.id === id);
  const getAssignedUsers = (projectId: string) =>
    allUsers.filter(u => Array.isArray(u.assignments) && u.assignments.some(a => a.projectId === projectId));

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <TestTube2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">Aucun projet ne correspond aux filtres actuels.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {projects.map(project => {
          const cfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.INACTIVE;
          const StatusIcon = cfg.icon;
          const progress = project.status === 'ACTIVE' ? getProgress(project.startDate, project.endDate) : project.status === 'COMPLETED' ? 100 : 0;
          const materials = (project.assignedMaterialIds ?? []).map(id => getMaterial(id)).filter(Boolean) as Material[];
          const assignedUsers = getAssignedUsers(project.id);

          // Days remaining
          let daysLeft: number | null = null;
          if (project.endDate && project.status === 'ACTIVE') {
            const end = parseISO(project.endDate);
            if (isValid(end)) daysLeft = differenceInDays(end, new Date());
          }

          return (
            <div
              key={project.id}
              className="group relative rounded-xl border border-border/70 bg-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              {/* Color accent bar */}
              <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bar)} />

              <div className="pl-5 pr-4 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                  {/* Main info */}
                  <div className="flex-1 min-w-0 space-y-2">

                    {/* Top row: name + status + actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base text-foreground leading-snug truncate">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1',
                          cfg.pill
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/project/${project.id}`} className="flex items-center">
                                <BarChart3 className="mr-2 h-4 w-4" /> Statistiques
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/project/${project.id}/chat`} className="flex items-center">
                                <MessageSquare className="mr-2 h-4 w-4" /> Chat du projet
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenNavigateDialog(project.location)}>
                              <MapPin className="mr-2 h-4 w-4" /> Voir sur la carte
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEditProject?.(project)}>
                              <Edit className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(project)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Meta row: location + dates */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {project.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {formatDate(project.startDate)} → {formatDate(project.endDate)}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className={cn(
                            'ml-1 font-medium',
                            daysLeft <= 7 ? 'text-destructive' : daysLeft <= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                          )}>
                            ({daysLeft}j restants)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {project.status === 'ACTIVE' && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">{progress}%</span>
                      </div>
                    )}

                    {/* Materials */}
                    {materials.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {materials.map(mat => (
                          <span
                            key={mat.id}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                              MATERIAL_COLORS[mat.type as MaterialType] ?? MATERIAL_COLORS.other
                            )}
                          >
                            <TestTube2 className="h-2.5 w-2.5" />
                            {MATERIAL_LABELS[mat.type as MaterialType] ?? mat.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">Aucun matériau assigné</p>
                    )}

                    {/* Assigned users */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <UserCircle2 className="h-3 w-3" /> Assignés :
                      </span>
                      {assignedUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedUsers.map(u => (
                            <span
                              key={u.id}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary ring-1 ring-primary/20"
                            >
                              {u.name}
                              <span className="text-primary/60 font-normal">
                                · {u.role === 'TECHNICIAN' ? 'Tech.' : u.role === 'SUPERVISOR' ? 'Sup.' : 'Admin'}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-destructive/70 italic">Aucun membre assigné</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <AlertDialog open={isNavigateDialogOpen} onOpenChange={setIsNavigateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ouvrir dans Google Maps</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous ouvrir <strong>"{navigationTarget}"</strong> dans Google Maps ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation} className="gap-2">
              <ArrowUpRight className="h-4 w-4" /> Ouvrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>"{projectToDelete?.name}"</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
