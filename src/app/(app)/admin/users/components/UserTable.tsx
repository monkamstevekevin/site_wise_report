'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical, Briefcase, Shield, HardHat, UserCog, Mail, CalendarDays, FolderKanban } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { User, UserRole, Project } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserFormData } from './UserFormDialog';
import { cn } from '@/lib/utils';

interface UserTableProps {
  users: User[];
  allProjects: Project[];
  onEditUser: (user: Partial<UserFormData> & { id: string }) => void;
  onDeleteUser: (user: User) => void;
  onAssignProjects: (user: User) => void;
  userActivity: Record<string, string | null>;
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; bar: string; pill: string; avatar: string }> = {
  ADMIN:      { label: 'Administrateur', icon: Shield,   bar: 'bg-rose-500',    pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800',       avatar: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  SUPERVISOR: { label: 'Superviseur',    icon: UserCog,  bar: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:ring-violet-800', avatar: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  TECHNICIAN: { label: 'Technicien',     icon: HardHat,  bar: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-800',           avatar: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

export function UserTable({ users, allProjects, onEditUser, onDeleteUser, onAssignProjects, userActivity }: UserTableProps) {
  const projectsById = React.useMemo(() =>
    allProjects.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, Project>),
    [allProjects]
  );

  const handleEdit = (user: User) => {
    onEditUser({ id: user.id, displayName: user.name, email: user.email, role: user.role });
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <HardHat className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">Aucun utilisateur ne correspond aux filtres actuels.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {users.map(user => {
        const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.TECHNICIAN;
        const RoleIcon = cfg.icon;
        const validAssignments = user.assignments?.filter(a => projectsById[a.projectId]) ?? [];

        return (
          <div
            key={user.id}
            className="group relative rounded-xl border border-border/70 bg-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            {/* Color accent bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bar)} />

            <div className="pl-5 pr-4 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                {/* Avatar + identity */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-11 w-11 shrink-0 ring-2 ring-border">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                    <AvatarFallback className={cn('text-sm font-bold', cfg.avatar)}>
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{user.name}</span>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                        cfg.pill
                      )}>
                        <RoleIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" /> {user.email}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {userActivity[user.id]
                        ? `Dernier rapport : ${timeAgo(userActivity[user.id]!)}`
                        : 'Aucun rapport soumis'}
                    </p>
                  </div>
                </div>

                {/* Assigned projects */}
                <div className="flex-1 min-w-0 sm:max-w-xs">
                  {validAssignments.length > 0 ? (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderKanban className="h-3 w-3" /> Projets assignés
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {validAssignments.map(a => {
                          const proj = projectsById[a.projectId];
                          const isFullTime = a.assignmentType === 'FULL_TIME';
                          return (
                            <span
                              key={a.projectId}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground ring-1 ring-border"
                              title={`${proj.name} — ${isFullTime ? 'Temps plein' : 'Temps partiel'}`}
                            >
                              {proj.name.length > 18 ? proj.name.slice(0, 16) + '…' : proj.name}
                              <span className={cn(
                                'text-[10px] font-semibold px-1 rounded',
                                isFullTime ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                              )}>
                                {isFullTime ? 'TPL' : 'TPA'}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" /> Aucun projet assigné
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignProjects(user)}>
                        <Briefcase className="mr-2 h-4 w-4" /> Assigner des projets
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDeleteUser(user)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
