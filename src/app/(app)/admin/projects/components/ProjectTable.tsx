
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

const mockProjects: Project[] = [
  {
    id: 'PJT001',
    name: 'Downtown Tower Renovation',
    location: 'Springfield, IL',
    description: 'Complete overhaul of the 20-story Downtown Tower, including facade and internal systems.',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-15T09:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-20T14:30:00Z').toISOString(),
  },
  {
    id: 'PJT002',
    name: 'Greenfield Highway Expansion',
    location: 'Route 66, AZ',
    description: 'Adding two new lanes to a 50-mile stretch of the historic Route 66.',
    status: 'ACTIVE',
    createdAt: new Date('2022-08-01T11:30:00Z').toISOString(),
    updatedAt: new Date('2024-06-01T10:00:00Z').toISOString(),
  },
  {
    id: 'PJT003',
    name: 'Coastal Bridge Repair',
    location: 'Port City, CA',
    description: 'Structural repairs and seismic retrofitting for the main coastal access bridge.',
    status: 'INACTIVE',
    createdAt: new Date('2024-01-10T16:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-05T09:20:00Z').toISOString(),
  },
  {
    id: 'PJT004',
    name: 'Suburban Water Treatment Plant',
    location: 'Rivertown, TX',
    description: 'Construction of a new water treatment facility to serve a growing suburban area.',
    status: 'COMPLETED',
    createdAt: new Date('2021-05-20T08:45:00Z').toISOString(),
    updatedAt: new Date('2023-11-10T17:00:00Z').toISOString(),
  },
  {
    id: 'PJT005',
    name: 'High-Speed Rail Corridor - Section A',
    location: 'Central Valley, CA',
    description: 'Initial earthworks and track laying for Section A of the new high-speed rail line.',
    status: 'ACTIVE',
    createdAt: new Date('2023-09-01T13:15:00Z').toISOString(),
    updatedAt: new Date('2024-06-10T11:00:00Z').toISOString(),
  },
];

interface ProjectTableProps {
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (projectId: string) => void;
}

const projectStatusBadgeVariant: Record<Project['status'], "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default", // Will use primary color
  COMPLETED: "secondary",
  INACTIVE: "outline",
};

export function ProjectTable({ onEditProject, onDeleteProject }: ProjectTableProps) {
  const [projects, setProjects] = React.useState<Project[]>(mockProjects);

  const handleEdit = (project: Project) => {
    console.log('Editing project:', project);
    onEditProject?.(project);
  };

  const handleDelete = (projectId: string) => {
    console.log('Deleting project ID:', projectId);
    onDeleteProject?.(projectId);
  };

  if (projects.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No projects found.</p>;
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
