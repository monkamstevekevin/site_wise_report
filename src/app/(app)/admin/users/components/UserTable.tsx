'use client';

import React from 'react';
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
import { Edit, Trash2, MoreVertical, Briefcase } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { User, UserRole, UserAssignment, Project } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserFormData } from './UserFormDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserTableProps {
  users: User[];
  allProjects: Project[];
  onEditUser: (user: Partial<UserFormData> & { id: string }) => void;
  onDeleteUser: (user: User) => void; 
  onAssignProjects: (user: User) => void;
}

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  ADMIN: "destructive",
  SUPERVISOR: "default",
  TECHNICIAN: "secondary",
};


export function UserTable({ users, allProjects, onEditUser, onDeleteUser, onAssignProjects }: UserTableProps) {

  const projectsById = React.useMemo(() => 
    allProjects.reduce((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {} as Record<string, Project>), 
  [allProjects]);

  const handleEdit = (user: User) => {
    const userToPass = {
      id: user.id,
      displayName: user.name,
      email: user.email,
      role: user.role,
    };
    onEditUser(userToPass);
  };

  const handleDelete = (user: User) => { 
    onDeleteUser(user);
  };


  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun utilisateur ne correspond aux filtres actuels.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>Une liste de {users.length > 5 ? `${users.length} utilisateurs` : 'utilisateurs'} dans le système.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID Utilisateur</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Projets Assignés</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const validAssignments = user.assignments?.filter(a => projectsById[a.projectId]) || [];
            return (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-xs">{user.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.name[0]}`} alt={user.name} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={roleBadgeVariant[user.role] || 'outline'}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                {validAssignments.length > 0 ? (
                  <TooltipProvider delayDuration={150}>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {validAssignments.map((assignment) => {
                        const project = projectsById[assignment.projectId];
                        const assignmentTypeLabel = assignment.assignmentType === 'FULL_TIME' ? 'TPL' : 'TPA';
                        const assignmentTypeFull = assignment.assignmentType === 'FULL_TIME' ? 'Temps Plein' : 'Temps Partiel';

                        return (
                          <Tooltip key={assignment.projectId}>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs font-normal cursor-default">
                                {project.name.length > 15 ? `${project.name.substring(0, 13)}...` : project.name}
                                <span className="ml-1.5 font-semibold opacity-80 border-l pl-1.5">{assignmentTypeLabel}</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{project.name} ({assignmentTypeFull})</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                ) : (
                  <span className="text-xs text-muted-foreground">Aucun</span>
                )}
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Ouvrir le menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier l'Utilisateur
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => onAssignProjects(user)}>
                      <Briefcase className="mr-2 h-4 w-4" /> Assigner des Projets
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'Utilisateur
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </div>
  );
}
