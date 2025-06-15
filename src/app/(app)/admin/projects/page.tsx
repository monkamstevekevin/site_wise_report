
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFormDialog, type ProjectFormData } from './components/ProjectFormDialog'; // Import ProjectFormData
import type { Project, Material } from '@/lib/types'; // Import Material
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProjects, addProject, updateProject, deleteProject } from '@/services/projectService';
import { getMaterials } from '@/services/materialService'; // Import getMaterials
import type { ProjectSubmitData } from '@/services/projectService'; // Import correct ProjectSubmitData

const projectStatusFilterOptions: { value: Project['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]); // State for all materials
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'ALL'>('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedProjects, fetchedMaterials] = await Promise.all([
        getProjects(),
        getMaterials() // Fetch all materials
      ]);
      setProjects(fetchedProjects);
      setAllMaterials(fetchedMaterials);
    } catch (err) {
      setError((err as Error).message || "Failed to load project data or materials. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      await fetchData(); // Refresh the list
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Delete Project",
        description: (err as Error).message || "An unexpected error occurred.",
      });
    }
  };

  const handleProjectFormSubmit = async (formData: ProjectFormData, id?: string) => {
    setIsProjectFormOpen(false); 

    // Convert ProjectFormData to ProjectSubmitData expected by the service
    const submitData: ProjectSubmitData = {
      name: formData.name,
      location: formData.location,
      description: formData.description,
      status: formData.status,
      startDate: formData.startDate ? formData.startDate.toISOString() : undefined,
      endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
      assignedMaterialIds: formData.assignedMaterialIds || [],
    };


    if (id) {
      try {
        await updateProject(id, submitData);
        toast({
          title: "Project Updated Successfully",
          description: `Project "${submitData.name}" has been updated.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Update Project",
          description: (err as Error).message || "An unexpected error occurred.",
        });
        setIsProjectFormOpen(true); // Re-open on error
      }
    } else {
      try {
        const newProjectId = await addProject(submitData);
        toast({
          title: "Project Added Successfully",
          description: `Project "${submitData.name}" (ID: ${newProjectId}) has been added.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Add Project",
          description: (err as Error).message || "An unexpected error occurred.",
        });
        setIsProjectFormOpen(true); // Re-open on error
      }
    }
    
    await fetchData(); // Refresh projects and materials
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
            allMaterials={allMaterials} // Pass all materials to the dialog
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
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading projects and materials...
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
            allMaterials={allMaterials} // Pass all materials to the table
            onEditProject={handleEditProject} 
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}
    </>
  );
}
