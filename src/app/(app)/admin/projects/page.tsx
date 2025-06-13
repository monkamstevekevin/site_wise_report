
'use client';

import React, { useState } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFormDialog } from './components/ProjectFormDialog';
import type { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function ProjectManagementPage() {
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const { toast } = useToast();

  const handleAddNewProject = () => {
    setEditingProject(undefined);
    setIsProjectFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    // Map project data to form data if names differ or for specific transformations
    const projectFormData = {
        id: project.id,
        name: project.name,
        location: project.location,
        description: project.description || '',
        status: project.status
    };
    setEditingProject(projectFormData as any); // Cast if needed for the dialog
    setIsProjectFormOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    console.log("Attempting to delete project ID:", projectId);
    // Here you would typically show a confirmation dialog, then make an API call
    toast({
      title: "Delete Action (Simulated)",
      description: `If implemented, project ${projectId} would be deleted.`,
      variant: "destructive"
    });
    // To update the table, you'd re-fetch data or filter the local state
  };

  // Placeholder for actual form submission logic (e.g., API call)
  const handleProjectFormSubmit = async (data: any, id?: string) => {
    console.log(id ? "Updating project:" : "Adding new project:", data, id);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: id ? "Project Updated (Simulated)" : "Project Added (Simulated)",
      description: `${data.name} has been successfully ${id ? 'updated' : 'added'}.`,
    });
    // Potentially re-fetch projects list or update local state to reflect changes in ProjectTable
  };

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
      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <ProjectTable
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
        />
      </div>
    </>
  );
}
