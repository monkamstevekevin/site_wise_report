
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { HardHat, Users, CalendarDays, AlertTriangle } from 'lucide-react';
import { differenceInDays, format, isFuture, isPast, parseISO } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  if (startDate && isFuture(startDate)) return 'default'; // Upcoming - Blue
  if (startDate && isPast(startDate) && project.status === 'ACTIVE') return 'default'; // Active and past start - Green (default is primary for active)
  
  return 'outline'; // Default for other cases like ACTIVE but future start (or if dates are missing)
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
    <Card className="shadow-lg rounded-lg lg:col-span-2"> {/* Added lg:col-span-2 to make it wider */}
      <CardHeader>
        <CardTitle className="flex items-center">
          <HardHat className="mr-2 h-5 w-5 text-primary" />
          Project Assignments Overview
        </CardTitle>
        <CardDescription>Status of active and upcoming projects (next 30 days) and their technician assignments.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-0"> {/* Remove padding for full-width table */}
        <ScrollArea className="h-96"> {/* Increased height for better table view */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Project Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Technicians</TableHead>
                <TableHead className="text-center">Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantProjects.map(project => {
                const assignedTechniciansCount = getAssignedTechniciansCount(project.id, users);
                const daysUntilStart = project.startDate ? differenceInDays(parseISO(project.startDate), now) : null;
                
                let alertNeeded = false;
                if (project.status === 'ACTIVE' && assignedTechniciansCount === 0) {
                  alertNeeded = true;
                } else if (daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 7 && assignedTechniciansCount === 0) {
                  alertNeeded = true;
                }

                return (
                  <TableRow key={project.id} className={cn(alertNeeded && "bg-amber-50 dark:bg-amber-900/30")}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/projects`} passHref>
                        <Button variant="link" className="p-0 h-auto text-primary hover:underline text-left justify-start">
                          {project.name}
                        </Button>
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{project.description}</p>
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
