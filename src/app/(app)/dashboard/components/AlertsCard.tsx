
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertCircle, HardHat, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import type { Project, User } from '@/lib/types';
import { differenceInDays, format, isFuture, isPast, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AlertsCardProps {
  projects: Project[];
  users: User[];
}

const INITIAL_ALERTS_DISPLAY_COUNT = 3;

const getAssignedTechniciansCount = (projectId: string, users: User[]): number => {
  return users.filter(user => user.role === 'TECHNICIAN' && user.assignedProjectIds.includes(projectId)).length;
};

const formatDatePretty = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return 'Invalid Date';
  }
};

export function AlertsCard({ projects, users }: AlertsCardProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const now = new Date();
  const criticalProjects: Array<Project & { alertReason: string }> = [];

  projects.forEach(project => {
    if (project.status === 'COMPLETED' || project.status === 'INACTIVE') {
      return;
    }

    const assignedTechniciansCount = getAssignedTechniciansCount(project.id, users);
    const startDate = project.startDate ? parseISO(project.startDate) : null;
    
    if (startDate && isFuture(startDate)) {
      const daysUntilStart = differenceInDays(startDate, now);
      if (daysUntilStart <= 3 && assignedTechniciansCount === 0) {
        criticalProjects.push({ ...project, alertReason: `Starts in ${daysUntilStart} day(s) - No technicians assigned.` });
      }
    } else if (startDate && isPast(startDate) && project.status === 'ACTIVE' && assignedTechniciansCount === 0) {
      criticalProjects.push({ ...project, alertReason: `Active project - No technicians assigned.` });
    }
  });

  criticalProjects.sort((a, b) => {
    const dateA = a.startDate ? parseISO(a.startDate).getTime() : Infinity;
    const dateB = b.startDate ? parseISO(b.startDate).getTime() : Infinity;
    return dateA - dateB;
  });

  const alertsToDisplay = showAllAlerts ? criticalProjects : criticalProjects.slice(0, INITIAL_ALERTS_DISPLAY_COUNT);
  const remainingAlertsCount = criticalProjects.length - INITIAL_ALERTS_DISPLAY_COUNT;

  const cardDescription = criticalProjects.length > 0 
    ? `${criticalProjects.length} projet(s) critique(s) nécessitent une attention immédiate pour l'assignation des techniciens.`
    : "Aucune alerte de projet critique nécessitant une attention immédiate.";


  if (criticalProjects.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-primary" />
            Alertes de Projet
          </CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Tous les projets sont en ordre concernant les assignations !</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertCircle className="mr-2 h-5 w-5" />
          Alertes de Projet Critiques
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className={criticalProjects.length > INITIAL_ALERTS_DISPLAY_COUNT ? "pb-0" : ""}>
        <ScrollArea className={criticalProjects.length > INITIAL_ALERTS_DISPLAY_COUNT && !showAllAlerts ? "h-72 pr-3" : (showAllAlerts ? "h-auto max-h-[400px] pr-3" : "h-auto pr-3")}>
          <div className="space-y-3">
            {alertsToDisplay.map(project => (
              <div key={project.id} className="p-3 rounded-md border border-destructive/30 bg-destructive/5 hover:bg-destructive/10">
                <div className="flex justify-between items-start mb-1">
                   <Link href={`/admin/projects`} passHref>
                     <Button variant="link" className="p-0 h-auto text-base font-semibold text-destructive hover:underline truncate">
                       {project.name}
                     </Button>
                   </Link>
                </div>
                 <p className="text-sm font-medium text-destructive-foreground mb-1">{project.alertReason}</p>
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
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {criticalProjects.length > INITIAL_ALERTS_DISPLAY_COUNT && (
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

