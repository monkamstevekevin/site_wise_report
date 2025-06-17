
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Users, UserPlus, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserFormDialog, type UserFormData } from './components/UserFormDialog';
import { UserTable } from './components/UserTable';
import { AssignProjectsDialog } from './components/AssignProjectsDialog';
import type { User, UserRole, Project, UserAssignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProjects } from '@/services/projectService';
import { getUsers, addUser, updateUserAssignments, updateUser, deleteUserFirestoreRecord } from '@/services/userService';
import { generateAssignmentNotificationEmail } from '@/ai/flows/assignment-notification-flow.ts'; 
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
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


const userRoleFilterOptions: { value: UserRole | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Rôles' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'SUPERVISOR', label: 'Superviseur' },
  { value: 'TECHNICIAN', label: 'Technicien' },
];

export default function UserManagementPage() {
  const [usersData, setUsersData] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState< (Partial<UserFormData> & { id?: string }) | undefined >(undefined);

  const [isAssignProjectsDialogOpen, setIsAssignProjectsDialogOpen] = useState(false);
  const [userToAssignProjects, setUserToAssignProjects] = useState<User | null>(null);
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { toast } = useToast();
  const { user: adminAuthUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  const fetchUsersAndProjects = async () => {
    setIsLoadingUsers(true);
    setIsLoadingProjects(true);
    setUsersError(null);
    try {
      const [fetchedUsers, fetchedProjects] = await Promise.all([
        getUsers(),
        getProjects()
      ]);
      setUsersData(fetchedUsers);
      setAllProjects(fetchedProjects);
    } catch (err) {
      setUsersError((err as Error).message || "Échec du chargement des données. Veuillez réessayer plus tard.");
      console.error("Erreur lors de la récupération des utilisateurs ou des projets:", err);
    } finally {
      setIsLoadingUsers(false);
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchUsersAndProjects();
  }, []);

  const handleAddNewUser = () => {
    setEditingUser(undefined);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: Partial<UserFormData> & { id: string }) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserFirestoreRecord(userToDelete.id);
      toast({
        title: "Enregistrement Utilisateur Supprimé",
        description: `L'utilisateur "${userToDelete.name}" (ID: ${userToDelete.id}) a été supprimé de Firestore. Son enregistrement d'authentification peut encore exister.`,
      });
      await fetchUsersAndProjects(); 
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Échec de la Suppression de l'Enregistrement Utilisateur",
        description: (err as Error).message || "Une erreur inattendue s'est produite.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };


  const handleUserFormSubmit = async (data: UserFormData & { password?: string }, id?: string) => {
    setIsUserFormOpen(false);

    if (id) { 
      try {
        await updateUser(id, { displayName: data.displayName, role: data.role });
        toast({
          title: "Utilisateur Mis à Jour avec Succès",
          description: `L'utilisateur "${data.displayName}" a été mis à jour.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Échec de la Mise à Jour de l'Utilisateur",
          description: (err as Error).message || "Une erreur inattendue s'est produite.",
        });
        setIsUserFormOpen(true); 
      }
    } else { 
      if (!data.password) {
        toast({ variant: "destructive", title: "Mot de Passe Manquant", description: "Le mot de passe est requis pour créer un nouvel utilisateur." });
        setIsUserFormOpen(true);
        return;
      }
      try {
        const newUserId = await addUser({
          displayName: data.displayName,
          email: data.email,
          role: data.role as UserRole 
        }, data.password);
        toast({
          title: "Utilisateur Ajouté avec Succès !",
          description: `L'utilisateur "${data.displayName}" (ID: ${newUserId}) a été créé.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Échec de l'Ajout de l'Utilisateur",
          description: (err as Error).message || "Une erreur inattendue s'est produite.",
        });
        setIsUserFormOpen(true); 
      }
    }
    await fetchUsersAndProjects(); 
    setEditingUser(undefined);
  };

  const handleOpenAssignProjectsDialog = (user: User) => {
    setUserToAssignProjects(user);
    setIsAssignProjectsDialogOpen(true);
  };

  const handleAssignProjects = async (userId: string, newAssignments: UserAssignment[]) => {
    setIsProcessingAssignment(true);
    const targetUser = usersData.find(u => u.id === userId);
    if (!targetUser || !adminAuthUser) {
      toast({ variant: "destructive", title: "Erreur", description: "Utilisateur ou administrateur non trouvé."});
      setIsProcessingAssignment(false);
      return;
    }

    const oldAssignments = targetUser.assignments || [];
    
    try {
      await updateUserAssignments(userId, newAssignments); 
      
      await fetchUsersAndProjects(); 

      const oldProjectIdsSet = new Set(oldAssignments.map(a => a.projectId));
      const newlyAssignedProjectDetails: { project: Project; assignmentType: UserAssignment['assignmentType'] }[] = [];

       for (const newAssignment of newAssignments) {
         if (!oldProjectIdsSet.has(newAssignment.projectId)) {
           const project = allProjects.find(p => p.id === newAssignment.projectId);
           if (project) {
             newlyAssignedProjectDetails.push({ project, assignmentType: newAssignment.assignmentType });
           }
         }
       }
      
       toast({
          title: "Assignations de Projet Mises à Jour",
          description: `Les assignations de projet de ${targetUser.name} ont été mises à jour avec succès. Notifications in-app envoyées. Processus de mise en file d'attente des e-mails initié pour les nouvelles assignations.`,
          duration: 7000,
      });
      
      for (const { project, assignmentType } of newlyAssignedProjectDetails) {
        if (process.env.NEXT_PUBLIC_SKIP_EMAIL_EXTENSION === 'true') {
          console.log(`Skipping email for project ${project.name} due to NEXT_PUBLIC_SKIP_EMAIL_EXTENSION flag.`);
          continue;
        }
        try {
          const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
          const assignmentTypeDisplay = assignmentType === 'FULL_TIME' ? 'à temps plein' : 'à temps partiel';
          const notificationContent = await generateAssignmentNotificationEmail({ 
            userName: targetUser.name,
            projectName: `${project.name} (Assignation ${assignmentTypeDisplay})`,
            projectLocation: project.location,
            assignerName: adminAuthUser.displayName || adminAuthUser.email || "Admin",
            appName: "SiteWise Reports",
            appUrl: appBaseUrl
          });
          
          const mailCollectionRef = collection(db, 'mail');
          await addDoc(mailCollectionRef, {
            to: [targetUser.email],
            message: {
              subject: notificationContent.emailSubject,
              html: notificationContent.emailBody,
            },
          });
          console.log(`Document e-mail pour le projet ${project.name} écrit dans la collection 'mail' pour ${targetUser.email}.`);
          toast({
            title: `E-mail Mis en File d'Attente pour ${project.name}`,
            description: `L'e-mail d'assignation pour ${targetUser.name} concernant ${project.name} (${assignmentTypeDisplay}) a été mis en file d'attente. Sujet : ${notificationContent.emailSubject}`,
            duration: 8000,
          });

        } catch (aiErrorOrMailError) {
          console.error(`Erreur lors de la génération du contenu ou de la mise en file d'attente de l'e-mail d'assignation pour le projet ${project.name}:`, aiErrorOrMailError);
          toast({ 
            variant: "destructive", 
            title: `Erreur E-mail pour ${project.name}`, 
            description: (aiErrorOrMailError as Error).message || "Impossible de générer ou de mettre en file d'attente la notification par e-mail."
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Échec de l'Assignation des Projets",
        description: (error as Error).message || "Une erreur inattendue s'est produite.",
      });
    } finally {
      setIsProcessingAssignment(false);
      setIsAssignProjectsDialogOpen(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return usersData.filter(user => {
      const matchesSearchTerm = searchTerm === '' ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearchTerm && matchesRole;
    });
  }, [usersData, searchTerm, roleFilter]);

  return (
    <>
      <PageTitle
        title="Gestion des Utilisateurs"
        icon={Users}
        subtitle="Administrez les comptes utilisateurs, les rôles et les assignations aux projets."
        actions={
          <UserFormDialog
            open={isUserFormOpen}
            onOpenChange={(isOpen) => {
              setIsUserFormOpen(isOpen);
              if (!isOpen) setEditingUser(undefined);
            }}
            userToEdit={editingUser}
            onFormSubmit={handleUserFormSubmit}
          >
            <Button className="rounded-lg" onClick={handleAddNewUser}>
              <UserPlus className="mr-2 h-4 w-4" /> Ajouter un Nouvel Utilisateur
            </Button>
          </UserFormDialog>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="user-search" className="mb-1 block text-sm font-medium">Rechercher des Utilisateurs</Label>
            <Input
              id="user-search"
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="role-filter" className="mb-1 block text-sm font-medium">Filtrer par Rôle</Label>
            <Select value={roleFilter} onValueChange={(value: UserRole | 'ALL') => setRoleFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]" id="role-filter">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                {userRoleFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button variant="outline" onClick={() => { setSearchTerm(''); setRoleFilter('ALL');}} className="h-10">
            <Filter className="mr-2 h-4 w-4" /> Effacer les Filtres
          </Button>
        </div>
      </div>

      {(isLoadingUsers || isLoadingProjects) && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Chargement des données...
        </div>
      )}
      {usersError && !isLoadingUsers && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Erreur de Chargement des Données</p>
           <p>{usersError}</p>
         </div>
      )}
      {!isLoadingUsers && !isLoadingProjects && !usersError && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          {isProcessingAssignment &&
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement des assignations...
            </div>
          }
          <UserTable
            users={filteredUsers}
            onEditUser={handleEditUser}
            onDeleteUser={openDeleteDialog}
            onAssignProjects={handleOpenAssignProjectsDialog}
          />
        </div>
      )}

      {isLoadingProjects ? (
         <div className="flex items-center justify-center p-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement des projets pour assignation...</div>
      ) : (
        <AssignProjectsDialog
          open={isAssignProjectsDialogOpen}
          onOpenChange={setIsAssignProjectsDialogOpen}
          user={userToAssignProjects}
          allProjects={allProjects}
          onAssignProjects={handleAssignProjects}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
              <AlertDialogTitle>Confirmer la Suppression de l'Enregistrement Utilisateur</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'enregistrement Firestore pour l'utilisateur "{userToDelete?.name}" (ID: {userToDelete?.id}) ?
              Cette action est irréversible et ne supprime que les données spécifiques à l'application. Le compte d'authentification Firebase de l'utilisateur restera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer l'Enregistrement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

