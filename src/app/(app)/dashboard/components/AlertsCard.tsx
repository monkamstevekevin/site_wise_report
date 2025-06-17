
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, HardHat, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import type { Project, User } from '@/lib/types';
import { differenceInDays, format, isFuture, isPast, parseISO, isToday, startOfDay, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AlertsCardProps {
  projects: Project[];
  users: User[];
}

const INITIAL_ALERTS_DISPLAY_COUNT = 3;

const getAssignedTechniciansCount = (projectId: string, users: User[]): number => {
  if (!Array.isArray(users)) return 0;
  return users.filter(user => 
    user.role === 'TECHNICIAN' && 
    Array.isArray(user.assignments) && user.assignments.some(a => a.projectId === projectId)
  ).length;
};

const formatDatePretty = (dateString?: string) => {
  if (!dateString) return 'N/D';
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) return 'Date invalide';
    return format(parsedDate, 'd MMM yyyy', { locale: fr });
  } catch {
    return 'Date invalide';
  }
};

interface ActionableProject extends Project {
  alertReason: string;
  severity: 'critical' | 'warning';
}

export function AlertsCard({ projects, users }: AlertsCardProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const today = startOfDay(new Date());

  const actionableProjects: ActionableProject[] = [];

  if (Array.isArray(projects)) {
    projects.forEach(project => {
      if (!project || project.status === 'COMPLETED' || project.status === 'INACTIVE') {
        return;
      }

      const assignedTechniciansCount = getAssignedTechniciansCount(project.id, users);
      if (assignedTechniciansCount > 0) return;

      const startDateStr = project.startDate;
      let projectStartDateOnly: Date | null = null;
      if (startDateStr) {
        const parsed = parseISO(startDateStr);
        if (isValid(parsed)) {
          projectStartDateOnly = startOfDay(parsed);
        }
      }
      
      if (projectStartDateOnly) {
        if (isToday(projectStartDateOnly)) {
          actionableProjects.push({
            ...project,
            alertReason: `Commence AUJOURD'HUI - Aucun technicien assigné.`,
            severity: 'critical',
          });
        } else if (isFuture(projectStartDateOnly)) {
          const daysFromToday = differenceInDays(projectStartDateOnly, today);
          if (daysFromToday >= 1 && daysFromToday <= 3) {
            actionableProjects.push({
              ...project,
              alertReason: `Commence dans ${daysFromToday} jour(s) - Aucun technicien assigné.`,
              severity: 'warning',
            });
          }
        } else if (isPast(projectStartDateOnly) && project.status === 'ACTIVE') {
          actionableProjects.push({
            ...project,
            alertReason: `Projet actif - Aucun technicien assigné.`,
            severity: 'critical',
          });
        }
      } else if (project.status === 'ACTIVE') {
          actionableProjects.push({
              ...project,
              alertReason: `Projet actif (date de début non spécifiée ou invalide) - Aucun technicien assigné.`,
              severity: 'critical',
          });
      }
    });
  }


  actionableProjects.sort((a, b) => {
    if (a.severity === 'critical' && b.severity === 'warning') return -1;
    if (a.severity === 'warning' && b.severity === 'critical') return 1;
    
    const aIsActiveNoDate = a.status === 'ACTIVE' && (!a.startDate || !isValid(parseISO(a.startDate)));
    const bIsActiveNoDate = b.status === 'ACTIVE' && (!b.startDate || !isValid(parseISO(b.startDate)));

    if (aIsActiveNoDate && !bIsActiveNoDate) return -1;
    if (!aIsActiveNoDate && bIsActiveNoDate) return 1;

    const dateA = a.startDate && isValid(parseISO(a.startDate)) ? parseISO(a.startDate).getTime() : Infinity;
    const dateB = b.startDate && isValid(parseISO(b.startDate)) ? parseISO(b.startDate).getTime() : Infinity;
    
    return dateA - dateB;
  });

  const alertsToDisplay = showAllAlerts ? actionableProjects : actionableProjects.slice(0, INITIAL_ALERTS_DISPLAY_COUNT);
  const remainingAlertsCount = actionableProjects.length - INITIAL_ALERTS_DISPLAY_COUNT;

  const hasCriticalAlerts = actionableProjects.some(p => p.severity === 'critical');
  const hasWarningAlerts = actionableProjects.some(p => p.severity === 'warning');

  let cardBorderClass = "border-border";
  let titleIconClass = "text-primary";
  if (hasCriticalAlerts) {
    cardBorderClass = "border-destructive/50";
    titleIconClass = "text-destructive";
  } else if (hasWarningAlerts) {
    cardBorderClass = "border-amber-500/50";
    titleIconClass = "text-amber-500";
  }
  
  const cardTitleText = "Alertes de Projet";
  const cardDescriptionText = actionableProjects.length > 0 
    ? `${actionableProjects.length} projet(s) nécessite(nt) une attention.`
    : "Aucune alerte de projet nécessitant une attention immédiate.";


  if (actionableProjects.length === 0) {
    return (
      <Card className={cn("shadow-lg rounded-lg", cardBorderClass)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className={cn("mr-2 h-5 w-5", titleIconClass)} />
            {cardTitleText}
          </CardTitle>
          <CardDescription>{cardDescriptionText}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Tous les projets sont en ordre concernant les assignations !</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-lg rounded-lg", cardBorderClass)}>
      <CardHeader>
        <CardTitle className={cn("flex items-center", titleIconClass)}>
          <AlertCircle className="mr-2 h-5 w-5" />
          {cardTitleText}
        </CardTitle>
        <CardDescription>{cardDescriptionText}</CardDescription>
      </CardHeader>
      <CardContent className={actionableProjects.length > INITIAL_ALERTS_DISPLAY_COUNT ? "pb-0" : ""}>
        <ScrollArea className={actionableProjects.length > INITIAL_ALERTS_DISPLAY_COUNT && !showAllAlerts ? "h-72 pr-3" : (showAllAlerts ? "h-auto max-h-[400px] pr-3" : "h-auto pr-3")}>
          <div className="space-y-3">
            {alertsToDisplay.map(project => {
              const isCritical = project.severity === 'critical';
              const itemBaseClass = isCritical 
                ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10' 
                : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10';
              const titleLinkClass = isCritical ? 'text-destructive' : 'text-amber-600';
              const reasonTextClass = isCritical ? 'text-destructive' : 'text-amber-700';

              return (
                <div key={project.id} className={cn("p-3 rounded-md border", itemBaseClass)}>
                  <div className="flex justify-between items-start mb-1">
                    <Link href={`/admin/projects`} passHref>
                      <Button variant="link" className={cn("p-0 h-auto text-base font-semibold hover:underline truncate", titleLinkClass)}>
                        {project.name}
                      </Button>
                    </Link>
                  </div>
                  <p className={cn("text-sm font-medium mb-1", reasonTextClass)}>{project.alertReason}</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    <CalendarDays className="inline-block mr-1.5 h-3.5 w-3.5" />
                    Début: {formatDatePretty(project.startDate)} 
                    {project.endDate && ` - Fin: ${formatDatePretty(project.endDate)}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <HardHat className="inline-block mr-1.5 h-3.5 w-3.5" />
                    Statut: {project.status}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
      {actionableProjects.length > INITIAL_ALERTS_DISPLAY_COUNT && (
        <CardFooter className="pt-4 flex justify-center">
          <Button variant="outline" onClick={() => setShowAllAlerts(!showAllAlerts)} className="rounded-lg">
            {showAllAlerts ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" /> Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" /> Voir plus ({remainingAlertsCount} restantes)
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
