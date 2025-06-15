
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Project, User } from '@/lib/types';
import { HardHat, Users, CalendarDays, AlertTriangle } from 'lucide-react';
import { differenceInDays, format, isFuture, isPast, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  if (project.startDate && isFuture(parseISO(project.startDate))) return 'default'; // Upcoming
  if (project.startDate && isPast(parseISO(project.startDate)) && (!project.endDate || isFuture(parseISO(project.endDate)))) return 'default'; // Active
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

  const relevantProjects = projects
    .filter(p => p.status === 'ACTIVE' || (p.startDate && isFuture(parseISO(p.startDate)) && differenceInDays(parseISO(p.startDate), now) <= 30))
    .sort((a, b) => (a.startDate && b.startDate ? parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime() : 0));

  if (relevantProjects.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardHat className="mr-2 h-5 w-5 text-primary" />
            Project Assignments Overview
          </CardTitle>
          <CardDescription>No active or upcoming projects within the next 30 days requiring technician assignment overview.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">All clear for now!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <HardHat className="mr-2 h-5 w-5 text-primary" />
          Project Assignments Overview
        </CardTitle>
        <CardDescription>Overview of active and upcoming projects and their technician assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 pr-3">
          <div className="space-y-4">
            {relevantProjects.map(project => {
              const assignedTechniciansCount = getAssignedTechniciansCount(project.id, users);
              const daysUntilStart = project.startDate ? differenceInDays(parseISO(project.startDate), now) : null;
              
              let dateInfo = `Start: ${formatDatePretty(project.startDate)}`;
              if (project.endDate) dateInfo += ` - End: ${formatDatePretty(project.endDate)}`;
              else if (daysUntilStart !== null && daysUntilStart >= 0) dateInfo = `Starts in ${daysUntilStart} day(s)`;
              else if (project.status === 'ACTIVE') dateInfo = `Started: ${formatDatePretty(project.startDate)}`;


              return (
                <div key={project.id} className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <Link href={`/admin/projects`} passHref>
                       <Button variant="link" className="p-0 h-auto text-base font-semibold text-primary hover:underline truncate">
                        {project.name}
                       </Button>
                    </Link>
                    <Badge variant={projectStatusVariant(project)}>{project.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center">
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> {dateInfo}
                  </p>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <Users className="mr-1.5 h-4 w-4 text-muted-foreground" />
                       <span>Technicians: {assignedTechniciansCount}</span>
                    </div>
                    {assignedTechniciansCount === 0 && project.status === 'ACTIVE' && (
                       <Badge variant="destructive" className="text-xs">
                         <AlertTriangle className="mr-1 h-3 w-3" /> Needs Assignment
                       </Badge>
                    )}
                     {assignedTechniciansCount === 0 && daysUntilStart !== null && daysUntilStart >=0 && daysUntilStart <= 7 && (
                       <Badge variant="destructive" className="text-xs">
                         <AlertTriangle className="mr-1 h-3 w-3" /> Needs Assignment Soon
                       </Badge>
                    )}
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
