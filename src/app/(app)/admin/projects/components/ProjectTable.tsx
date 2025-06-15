
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical, MessageSquare, MapPin, AlertTriangle, CalendarDays } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/lib/types';
import { format } from 'date-fns';

interface ProjectTableProps {
  projects: Project[];
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

const projectStatusBadgeVariant: Record<Project['status'], "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  INACTIVE: "outline",
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'PP'); // 'PP' for localized date format like 'Oct 22, 2023'
  } catch (e) {
    return 'Invalid Date';
  }
};

export function ProjectTable({ projects, onEditProject, onDeleteProject }: ProjectTableProps) {
  const [isNavigateDialogOpen, setIsNavigateDialogOpen] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleEdit = (project: Project) => {
    onEditProject?.(project);
  };

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (projectToDelete && onDeleteProject) {
      onDeleteProject(projectToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

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

  if (projects.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun projet ne correspond aux filtres actuels.</p>;
  }

  return (
    <>
      <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
        <Table>
          {projects.length > 5 && <TableCaption>Une liste de {projects.length} projets dans le système.</TableCaption>}
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID Projet</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4" /> Date Début</TableHead>
              <TableHead><CalendarDays className="inline-block mr-1 h-4 w-4" /> Date Fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium text-xs">{project.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{project.name}</div>
                  {project.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{project.description}</div>}
                </TableCell>
                <TableCell>{project.location}</TableCell>
                <TableCell className="text-xs">{formatDate(project.startDate)}</TableCell>
                <TableCell className="text-xs">{formatDate(project.endDate)}</TableCell>
                <TableCell>
                  <Badge variant={projectStatusBadgeVariant[project.status] || 'outline'}>{project.status}</Badge>
                </TableCell>
                <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/project/${project.id}/chat`}>
                          <MessageSquare className="mr-2 h-4 w-4" /> Ouvrir le Chat
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenNavigateDialog(project.location)}>
                        <MapPin className="mr-2 h-4 w-4" /> Naviguer vers le site
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(project)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projectToDelete?.name}" (ID: {projectToDelete?.id}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
