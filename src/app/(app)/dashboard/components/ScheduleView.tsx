
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project, UserAssignment } from '@/lib/types';
import {
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  isToday as isTodayDateFns,
  isValid,
} from 'date-fns';
import { fr } from 'date-fns/locale'; 
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleViewProps {
  assignments: UserAssignment[];
  allProjects: Project[];
}

interface DailyProject {
  id: string;
  name: string;
  assignmentType: UserAssignment['assignmentType'];
  status: Project['status'];
  isFullDay: boolean;
}

export function ScheduleView({ assignments, allProjects }: ScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setCurrentDate(new Date());
    setIsLoading(false);
  }, []);

  const weekStart = useMemo(() => currentDate ? startOfWeek(currentDate, { weekStartsOn: 1 }) : null, [currentDate]);
  const weekEnd = useMemo(() => currentDate ? endOfWeek(currentDate, { weekStartsOn: 1 }) : null, [currentDate]);
  const daysInWeek = useMemo(() => (weekStart && weekEnd) ? eachDayOfInterval({ start: weekStart, end: weekEnd }) : [], [weekStart, weekEnd]);

  const projectsById = useMemo(() => {
    if (!Array.isArray(allProjects)) return {};
    return allProjects.reduce((acc, project) => {
      if (project && project.id) {
        acc[project.id] = project;
      }
      return acc;
    }, {} as Record<string, Project>);
  }, [allProjects]);

  const getProjectsForDay = (day: Date): DailyProject[] => {
    const dailyProjects: DailyProject[] = [];
    if (!Array.isArray(assignments)) return dailyProjects;

    assignments.forEach(assignment => {
      if (!assignment || !assignment.projectId) return;
      const project = projectsById[assignment.projectId];
      if (!project || project.status !== 'ACTIVE' || !project.startDate) return;

      const projectStartDateStr = project.startDate;
      const projectEndDateStr = project.endDate;
      
      const parsedStartDate = parseISO(projectStartDateStr);
      if (!isValid(parsedStartDate)) return;

      const projectStartDate = parsedStartDate;
      let projectEndDate: Date | null = null;
      if (projectEndDateStr) {
          const parsedEndDate = parseISO(projectEndDateStr);
          if (isValid(parsedEndDate)) {
              projectEndDate = parsedEndDate;
          } else {
            // If end date is invalid, treat as ongoing but warn
            console.warn(`Invalid end date for project ${project.id}: ${projectEndDateStr}`);
          }
      }

      const interval = {
        start: projectStartDate,
        end: projectEndDate || new Date(8640000000000000), // Far future if no end date
      };

      if (isWithinInterval(day, interval)) {
        dailyProjects.push({
          id: project.id,
          name: project.name,
          assignmentType: assignment.assignmentType,
          status: project.status,
          isFullDay: assignment.assignmentType === 'FULL_TIME',
        });
      }
    });
    return dailyProjects.sort((a, b) => (a.isFullDay === b.isFullDay ? 0 : a.isFullDay ? -1 : 1));
  };

  const handlePreviousWeek = () => setCurrentDate(prev => prev ? subWeeks(prev, 1) : new Date());
  const handleNextWeek = () => setCurrentDate(prev => prev ? addWeeks(prev, 1) : new Date());
  const handleToday = () => setCurrentDate(new Date());

  if (isLoading || !currentDate || !weekStart || !weekEnd) {
      return (
        <Card className="shadow-md rounded-lg mt-6">
            <CardHeader>
                <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Mon Planning Hebdomadaire</CardTitle>
                <CardDescription>Chargement des données du planning...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 md:gap-3">
                    {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
                </div>
            </CardContent>
        </Card>
      );
  }
  
  if (!Array.isArray(assignments) || assignments.length === 0) {
     return (
        <Card className="shadow-md rounded-lg mt-6">
            <CardHeader>
                <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Mon Planning Hebdomadaire</CardTitle>
                <CardDescription>Aperçu de vos projets assignés pour la semaine.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-4">Vous n'êtes assigné(e) à aucun projet actif pour le moment.</p>
            </CardContent>
        </Card>
      );
  }


  return (
    <div className="space-y-4 mt-8">
      <Card className="shadow-xl rounded-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <CardTitle className="text-xl md:text-2xl font-headline flex items-center">
                <CalendarDays className="mr-3 h-6 w-6 text-primary"/>
                Mon Planning Hebdomadaire
            </CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="rounded-md">
                <ChevronLeft className="h-4 w-4" /> Préc.
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday} className="rounded-md">
                Aujourd'hui
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextWeek} className="rounded-md">
                Suiv. <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </div>
           <CardDescription className="mt-2">
            Semaine du {format(weekStart, 'd MMM', { locale: fr })} au {format(weekEnd, 'd MMM yyyy', { locale: fr })}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 md:gap-3">
                {daysInWeek.map(day => {
                const projectsOnDay = getProjectsForDay(day);
                const isCurrentDay = isTodayDateFns(day);
                return (
                    <Card 
                    key={day.toISOString()} 
                    className={cn(
                        "shadow-sm rounded-lg flex flex-col min-h-[180px] transition-all duration-200 ease-in-out",
                        isCurrentDay ? "border-primary border-2 scale-105 bg-primary/5" : "border hover:shadow-md",
                        "dark:bg-card"
                    )}
                    >
                    <CardHeader className={cn("p-2.5", isCurrentDay ? "bg-primary/10" : "bg-muted/30 dark:bg-muted/20")}>
                        <CardTitle className="text-xs sm:text-sm font-semibold capitalize text-center">
                        {format(day, 'eeee', { locale: fr })}
                        </CardTitle>
                        <CardDescription className="text-xs text-center text-muted-foreground">
                        {format(day, 'd MMM', { locale: fr })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-1.5 sm:p-2 space-y-1.5 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50">
                        {projectsOnDay.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center pt-4">Aucun projet.</p>
                        ) : (
                        projectsOnDay.map(proj => (
                            <Link key={proj.id} href={`/project/${proj.id}/chat`} passHref>
                            <div className={cn(
                                "block p-1.5 rounded-md text-xs hover:shadow-md transition-shadow cursor-pointer",
                                proj.isFullDay ? "bg-primary/20 hover:bg-primary/30 dark:bg-primary/30 dark:hover:bg-primary/40" : "bg-secondary/70 hover:bg-secondary dark:bg-secondary/50 dark:hover:bg-secondary/70"
                            )}>
                                <p className="font-medium truncate text-foreground" title={proj.name}>{proj.name}</p>
                                <Badge 
                                variant={proj.isFullDay ? "default" : "secondary"} 
                                className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 mt-0.5"
                                >
                                {proj.assignmentType === 'FULL_TIME' ? 'Temps Plein' : 'Temps Partiel'}
                                </Badge>
                            </div>
                            </Link>
                        ))
                        )}
                    </CardContent>
                    </Card>
                );
                })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
