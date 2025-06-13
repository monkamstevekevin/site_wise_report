
'use client';

import React, { useState, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFormDialog } from './components/ProjectFormDialog';
import type { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Moved mockProjects here
const mockProjectsData: Project[] = [
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

const projectStatusFilterOptions: { value: Project['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ProjectManagementPage() {
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'ALL'>('ALL');

  const handleAddNewProject = () => {
    setEditingProject(undefined);
    setIsProjectFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    const projectFormData = {
        id: project.id,
        name: project.name,
        location: project.location,
        description: project.description || '',
        status: project.status
    };
    setEditingProject(projectFormData as any);
    setIsProjectFormOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    console.log("Attempting to delete project ID:", projectId);
    toast({
      title: "Delete Action (Simulated)",
      description: `If implemented, project ${projectId} would be deleted.`,
      variant: "destructive"
    });
  };

  const handleProjectFormSubmit = async (data: any, id?: string) => {
    console.log(id ? "Updating project:" : "Adding new project:", data, id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: id ? "Project Updated (Simulated)" : "Project Added (Simulated)",
      description: `${data.name} has been successfully ${id ? 'updated' : 'added'}.`,
    });
    // In a real app, you would update `mockProjectsData` state or re-fetch
  };

  const filteredProjects = useMemo(() => {
    return mockProjectsData.filter(project => {
      const matchesSearchTerm = searchTerm === '' ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      return matchesSearchTerm && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  return (
    <>
      <PageTitle
        title="Project Management"
        icon={HardHat}
        subtitle="Manage all construction projects and their details."
        actions={
          <ProjectFormDialog
            open={isProjectFormOpen}
            onOpenChange={setIsProjectFormOpen}
            projectToEdit={editingProject}
            onFormSubmit={handleProjectFormSubmit}
          >
            <Button className="rounded-lg" onClick={handleAddNewProject}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
            </Button>
          </ProjectFormDialog>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="project-search" className="mb-1 block text-sm font-medium">Search Projects</Label>
            <Input
              id="project-search"
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="status-filter" className="mb-1 block text-sm font-medium">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={(value: Project['status'] | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]" id="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {projectStatusFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL');}} className="h-10">
            <Filter className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </div>

      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <ProjectTable
          projects={filteredProjects}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
        />
      </div>
    </>
  );
}
