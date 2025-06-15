
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Project, User } from '@/lib/types';
import { HardHat, AlertTriangle } from 'lucide-react';
import { differenceInDays, format, isFuture, isPast, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation'; // Import useRouter
import { cn } from '@/lib/utils';

interface ProjectAssignmentsCardProps {
  projects: Project[];
  users: User[];
}

const getAssignedTechniciansCount = (projectId: string, users: User[]): number => {
  return users.filter(user => user.role === 'TECHNICIAN' && user.assignedProjectIds.includes(projectId)).length;
};

const projectStatusVariant = (project: Project): "default" | "secondary" | "outline" | "destructive" => {
  if (project.status === 'COMPLETED') return 'secondary';
  if (project.status === 'INACTIVE') return 'outline';
  
  const startDate = project.startDate ? parseISO(project.startDate) : null;
  if (startDate && isFuture(startDate)) return 'default';
  if (startDate && isPast(startDate) && project.status === 'ACTIVE') return 'default'; 
  
  return 'outline';
};

const formatDatePretty = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return 'Invalid Date';
  }
};

export function ProjectAssignmentsCard({ projects, users }: ProjectAssignmentsCardProps) {
  const now = new Date();
  const router = useRouter(); // Initialize router

  if (projects.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardHat className="mr-2 h-5 w-5 text-primary" />
            Aperçu des Assignations de Projets
          </CardTitle>
          <CardDescription>Projets et assignations de techniciens pour la période sélectionnée.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Aucun projet ne correspond à la plage de dates sélectionnée ou aux critères actifs/à venir.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <HardHat className="mr-2 h-5 w-5 text-primary" />
          Aperçu des Assignations de Projets
        </CardTitle>
        <CardDescription>Projets et assignations de techniciens pour la période sélectionnée. Cliquez sur une ligne pour accéder au chat du projet.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nom du Projet</TableHead>
                <TableHead>Date Début</TableHead>
                <TableHead>Date Fin</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">Techniciens</TableHead>
                <TableHead className="text-center">Alerte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map(project => {
                const assignedTechniciansCount = getAssignedTechniciansCount(project.id, users);
                const daysUntilStart = project.startDate ? differenceInDays(parseISO(project.startDate), now) : null;
                
                let alertNeeded = false;
                if (project.status === 'ACTIVE' && assignedTechniciansCount === 0) {
                  alertNeeded = true;
                } else if (daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 7 && assignedTechniciansCount === 0) {
                  alertNeeded = true;
                }

                return (
                  <TableRow 
                    key={project.id} 
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      alertNeeded && "bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-800/40"
                    )}
                    onClick={() => router.push(`/project/${project.id}/chat`)}
                  >
                    <TableCell className="font-medium">
                      <div className="text-primary hover:underline text-left justify-start whitespace-normal">
                        {project.name}
                      </div>
                      {project.description && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{project.description}</p>}
                    </TableCell>
                    <TableCell className="text-xs">{formatDatePretty(project.startDate)}</TableCell>
                    <TableCell className="text-xs">{formatDatePretty(project.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={projectStatusVariant(project)} className="text-xs whitespace-nowrap">
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{assignedTechniciansCount}</TableCell>
                    <TableCell className="text-center">
                      {alertNeeded && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Needs Assignment
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Added Card, CardHeader, CardContent, CardTitle, CardDescription to satisfy imports for this component if it's the only one modified.
// Assuming they are already correctly defined in their respective files.
// If not, they are standard ShadCN components.
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
