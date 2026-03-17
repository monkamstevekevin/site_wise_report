
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { HardHat, PlusCircle, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFormDialog } from './components/ProjectFormDialog';
import type { ProjectFormData } from './components/ProjectFormDialog';
import type { Project, Material, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { addProject, updateProject, deleteProject } from '@/services/projectService';
import { getProjectsSubscription } from '@/lib/projectClientService';
import { getMaterialsSubscription } from '@/lib/materialClientService';
import { getUsersSubscription } from '@/lib/userClientService';
import type { ProjectSubmitData } from '@/services/projectService';
import { useAuth } from '@/contexts/AuthContext';

const projectStatusFilterOptions: { value: Project['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Statuts' },
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'COMPLETED', label: 'Terminé' },
];

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'ALL'>('ALL');

  useEffect(() => {
    setIsLoading(true);
    const unsubProjects = getProjectsSubscription(
        user?.organizationId,
        (fetchedProjects) => {
            setProjects(fetchedProjects);
            if (!isLoading) setIsLoading(false);
        },
        (err) => {
            setError((err as Error).message || "Échec du chargement des projets.");
            setIsLoading(false);
        }
    );

    const unsubMaterials = getMaterialsSubscription(
        (fetchedMaterials) => {
            setAllMaterials(fetchedMaterials);
            if (!isLoading) setIsLoading(false);
        },
        (err) => {
            setError((err as Error).message || "Échec du chargement des matériaux.");
            setIsLoading(false);
        },
        user?.organizationId
    );

    const unsubUsers = getUsersSubscription(
        user?.organizationId,
        (fetchedUsers) => { setAllUsers(fetchedUsers); },
        (err) => { console.error("Échec du chargement des utilisateurs:", err); }
    );

    Promise.all([unsubProjects, unsubMaterials, unsubUsers]).then(() => setIsLoading(false)).catch(console.error);

    return () => {
        unsubProjects();
        unsubMaterials();
        unsubUsers();
    };
  }, [user?.organizationId]);

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
        title: "Projet Supprimé",
        description: `Le projet (ID: ${projectId}) a été supprimé avec succès.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Échec de la Suppression du Projet",
        description: (err as Error).message || "Une erreur inattendue s'est produite.",
      });
    }
  };

  const handleProjectFormSubmit = async (formData: ProjectFormData, id?: string) => {
    setIsProjectFormOpen(false); 

    const submitData: ProjectSubmitData = {
      name: formData.name,
      location: formData.location,
      description: formData.description,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate,
      assignedMaterialIds: formData.assignedMaterialIds || [],
    };


    if (id) {
      try {
        await updateProject(id, submitData);
        toast({
          title: "Projet Mis à Jour avec Succès",
          description: `Le projet "${submitData.name}" a été mis à jour.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Échec de la Mise à Jour du Projet",
          description: (err as Error).message || "Une erreur inattendue s'est produite.",
        });
        setIsProjectFormOpen(true); 
      }
    } else {
      try {
        const newProjectId = await addProject(submitData, user?.organizationId);
        toast({
          title: "Projet Ajouté avec Succès",
          description: `Le projet "${submitData.name}" (ID: ${newProjectId}) a été ajouté.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Échec de l'Ajout du Projet",
          description: (err as Error).message || "Une erreur inattendue s'est produite.",
        });
        setIsProjectFormOpen(true); 
      }
    }
    
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
        title="Gestion des Projets"
        icon={HardHat}
        subtitle="Gérez tous les projets de construction et leurs détails."
        actions={
          <ProjectFormDialog
            open={isProjectFormOpen}
            onOpenChange={(isOpen) => {
              setIsProjectFormOpen(isOpen);
              if (!isOpen) setEditingProject(undefined); 
            }}
            projectToEdit={editingProject}
            onFormSubmit={handleProjectFormSubmit}
            allMaterials={allMaterials}
          >
            <Button className="rounded-lg" onClick={handleAddNewProject}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Nouveau Projet
            </Button>
          </ProjectFormDialog>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="project-search" className="mb-1 block text-sm font-medium">Rechercher des Projets</Label>
            <Input
              id="project-search"
              type="text"
              placeholder="Rechercher par nom ou localisation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="status-filter" className="mb-1 block text-sm font-medium">Filtrer par Statut</Label>
            <Select value={statusFilter} onValueChange={(value: Project['status'] | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]" id="status-filter">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                {projectStatusFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL');}} className="h-10">
            <Filter className="mr-2 h-4 w-4" /> Effacer les Filtres
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Chargement des projets et matériaux...
        </div>
      )}
      {error && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Erreur</p>
           <p>{error}</p>
         </div>
      )}
      {!isLoading && !error && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          <ProjectTable
            projects={filteredProjects}
            allMaterials={allMaterials}
            allUsers={allUsers}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}
    </>
  );
}
