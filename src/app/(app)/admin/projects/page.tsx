
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFormDialog, type ProjectSubmitData } from './components/ProjectFormDialog';
import type { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProjects, addProject, updateProject, deleteProject } from '@/services/projectService';

const projectStatusFilterOptions: { value: Project['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'ALL'>('ALL');

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      setError((err as Error).message || "Failed to load projects. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddNewProject = () => {
    setEditingProject(undefined); 
    setIsProjectFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project); 
    setIsProjectFormOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast({
        title: "Project Deleted",
        description: `Project (ID: ${projectId}) has been successfully deleted.`,
      });
      await fetchProjects(); // Refresh the list
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Delete Project",
        description: (err as Error).message || "An unexpected error occurred.",
      });
    }
  };

  const handleProjectFormSubmit = async (data: ProjectSubmitData, id?: string) => {
    setIsProjectFormOpen(false); 

    if (id) {
      try {
        await updateProject(id, data);
        toast({
          title: "Project Updated Successfully",
          description: `Project "${data.name}" has been updated.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Update Project",
          description: (err as Error).message || "An unexpected error occurred.",
        });
      }
    } else {
      try {
        const newProjectId = await addProject(data);
        toast({
          title: "Project Added Successfully",
          description: `Project "${data.name}" (ID: ${newProjectId}) has been added.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Add Project",
          description: (err as Error).message || "An unexpected error occurred.",
        });
      }
    }
    
    await fetchProjects();
    setEditingProject(undefined); 
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearchTerm = searchTerm === '' ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
      return matchesSearchTerm && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  return (
    <>
      <PageTitle
        title="Project Management"
        icon={HardHat}
        subtitle="Manage all construction projects and their details."
        actions={
          <ProjectFormDialog
            open={isProjectFormOpen}
            onOpenChange={(isOpen) => {
              setIsProjectFormOpen(isOpen);
              if (!isOpen) setEditingProject(undefined); 
            }}
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

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading projects...
        </div>
      )}
      {error && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Error</p>
           <p>{error}</p>
         </div>
      )}
      {!isLoading && !error && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          <ProjectTable
            projects={filteredProjects}
            onEditProject={handleEditProject} 
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}
    </>
  );
}
