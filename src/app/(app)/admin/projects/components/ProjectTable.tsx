
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
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/lib/types';

interface ProjectTableProps {
  projects: Project[]; // Accept projects as a prop
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

const projectStatusBadgeVariant: Record<Project['status'], "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  INACTIVE: "outline",
};

export function ProjectTable({ projects, onEditProject, onDeleteProject }: ProjectTableProps) {

  const handleEdit = (project: Project) => {
    onEditProject?.(project);
  };

  const handleDelete = (projectId: string) => {
    onDeleteProject?.(projectId);
  };

  if (projects.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No projects match the current filters.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Project ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
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
              <TableCell>
                <Badge variant={projectStatusBadgeVariant[project.status] || 'outline'}>{project.status}</Badge>
              </TableCell>
              <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(project)} disabled>
                      <Edit className="mr-2 h-4 w-4" /> Edit (Soon)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete (Soon)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {projects.length > 5 && <TableCaption>A list of {projects.length} projects in the system.</TableCaption>}
    </div>
  );
}
