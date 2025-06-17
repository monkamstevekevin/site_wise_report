
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MapPin, FileText, AlertTriangle, CalendarDays } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MyProjectCardProps {
  project: Project;
}

const projectStatusBadgeVariant: Record<Project['status'], "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  INACTIVE: "outline",
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/D';
  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) return 'Date invalide';
    return format(parsedDate, 'PP', { locale: fr });
  } catch (e) {
    return 'Date invalide';
  }
};

export function MyProjectCard({ project }: MyProjectCardProps) {
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);

  const handleOpenNavigateDialog = (location: string) => {
    setNavigationTarget(location);
    setIsNavigateDialogOpen(true);
  };

  const handleConfirmNavigation = () => {
    if (navigationTarget) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navigationTarget)}`;
      window.open(mapsUrl, '_blank');
    }
    setIsNavigateDialogOpen(false);
    setNavigationTarget(null);
  };

  return (
    <>
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle className="text-xl font-headline">{project.name}</CardTitle>
                  <CardDescription className="flex items-center text-sm mt-1">
                      <MapPin className="mr-1.5 h-4 w-4 text-muted-foreground" /> {project.location}
                  </CardDescription>
              </div>
              <Badge variant={projectStatusBadgeVariant[project.status] || 'outline'} className="ml-2 whitespace-nowrap">
                  {project.status}
              </Badge>
          </div>
          {project.description && <p className="text-sm text-muted-foreground pt-2">{project.description}</p>}
        </CardHeader>
        <CardContent className="flex-grow space-y-2">
          <div>
            <p className="text-xs text-muted-foreground flex items-center">
              <CalendarDays className="mr-1.5 h-3 w-3" /> Date de début:
            </p>
            <p className="text-sm font-medium">{formatDate(project.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center">
              <CalendarDays className="mr-1.5 h-3 w-3" /> Date de fin:
            </p>
            <p className="text-sm font-medium">{formatDate(project.endDate)}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-2">ID Projet: {project.id}</p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto rounded-lg">
            <Link href={`/reports?projectId=${project.id}`}>
              <FileText className="mr-2 h-4 w-4" /> Voir Rapports
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-lg" onClick={() => handleOpenNavigateDialog(project.location)}>
            <MapPin className="mr-2 h-4 w-4" /> Naviguer
          </Button>
          <Button size="sm" asChild className="w-full sm:w-auto rounded-lg">
            <Link href={`/project/${project.id}/chat`}>
              <MessageSquare className="mr-2 h-4 w-4" /> Ouvrir Chat
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isNavigateDialogOpen} onOpenChange={setIsNavigateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la navigation</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous ouvrir la localisation "{navigationTarget}" dans votre application de cartographie ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsNavigateDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNavigation}>Naviguer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
