
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Users, UserPlus, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserFormDialog, type UserFormData } from './components/UserFormDialog';
import { UserTable } from './components/UserTable';
import { AssignProjectsDialog } from './components/AssignProjectsDialog';
import type { User, UserRole, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProjects } from '@/services/projectService';
import { getUsers, addUser, updateUserAssignedProjects, updateUser, deleteUserFirestoreRecord } from '@/services/userService';
import { sendAssignmentNotification } from '@/ai/flows/assignment-notification-flow';
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
import { collection, addDoc } from 'firebase/firestore'; // Added Firestore imports
import { db } from '@/lib/firebase'; // Added db import

const userRoleFilterOptions: { value: UserRole | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'TECHNICIAN', label: 'Technician' },
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

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);
    try {
      const fetchedUsers = await getUsers();
      setUsersData(fetchedUsers);
    } catch (err) {
      setUsersError((err as Error).message || "Failed to load users. Please try again later.");
      console.error("Error fetching users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const fetchAllProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await getProjects();
        setAllProjects(fetchedProjects);
      } catch (error) {
        console.error("Failed to fetch projects for assignment dialog:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load projects for assignment." });
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchAllProjects();
  }, [toast]);

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
        title: "User Record Deleted",
        description: `User "${userToDelete.name}" (ID: ${userToDelete.id}) has been deleted from Firestore. Their authentication record may still exist.`,
      });
      await fetchUsers(); 
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Delete User Record",
        description: (err as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };


  const handleUserFormSubmit = async (data: UserFormData & { password?: string }, id?: string) => {
    setIsUserFormOpen(false);

    if (id) { // Editing user
      try {
        await updateUser(id, { displayName: data.displayName, role: data.role });
        toast({
          title: "User Updated Successfully",
          description: `User "${data.displayName}" has been updated.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Update User",
          description: (err as Error).message || "An unexpected error occurred.",
        });
        setIsUserFormOpen(true); 
      }
    } else { // Adding new user
      if (!data.password) {
        toast({ variant: "destructive", title: "Missing Password", description: "Password is required to create a new user." });
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
          title: "User Added Successfully!",
          description: `User "${data.displayName}" (ID: ${newUserId}) has been created.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Add User",
          description: (err as Error).message || "An unexpected error occurred.",
        });
        setIsUserFormOpen(true); 
      }
    }
    await fetchUsers(); 
    setEditingUser(undefined);
  };

  const handleOpenAssignProjectsDialog = (user: User) => {
    setUserToAssignProjects(user);
    setIsAssignProjectsDialogOpen(true);
  };

  const handleAssignProjects = async (userId: string, selectedProjectIds: string[]) => {
    setIsProcessingAssignment(true);
    const targetUser = usersData.find(u => u.id === userId);
    if (!targetUser || !adminAuthUser) {
      toast({ variant: "destructive", title: "Error", description: "User or admin not found."});
      setIsProcessingAssignment(false);
      return;
    }

    const oldProjectIds = new Set(targetUser.assignedProjectIds || []);
    
    try {
      // This service call handles creating the in-app notification
      await updateUserAssignedProjects(userId, selectedProjectIds);
      toast({
        title: "Projects Assigned Successfully",
        description: `${targetUser.name}'s project assignments have been updated. In-app notifications sent.`,
      });
      await fetchUsers();

      const newlyAssignedProjects = selectedProjectIds
        .filter(id => !oldProjectIds.has(id))
        .map(id => allProjects.find(p => p.id === id))
        .filter(p => p !== undefined) as Project[];
      
      if (newlyAssignedProjects.length > 0) {
        toast({
            title: "Email Notifications",
            description: `Initiating email notifications for ${targetUser.name} for newly assigned projects.`,
            duration: 7000,
        });
      }
      
      // Trigger email sending via Firebase Extension for newly assigned projects
      for (const project of newlyAssignedProjects) {
        try {
          const notificationContent = await sendAssignmentNotification({
            userName: targetUser.name,
            userEmail: targetUser.email,
            projectName: project.name,
            projectLocation: project.location,
            assignerName: adminAuthUser.displayName || adminAuthUser.email || "Admin", 
          });

          // Write to Firestore 'mail' collection for the Trigger Email extension
          const mailCollectionRef = collection(db, 'mail');
          await addDoc(mailCollectionRef, {
            to: [targetUser.email], // Must be an array
            message: {
              subject: notificationContent.emailSubject,
              html: notificationContent.emailBody, // Assuming body is HTML or Markdown that email clients can render
            },
          });
          console.log(`Email document written to 'mail' collection for ${targetUser.email} for project ${project.name}`);

        } catch (aiErrorOrMailError) {
          console.error(`Error generating or queueing assignment email for project ${project.name}:`, aiErrorOrMailError);
          toast({ 
            variant: "destructive", 
            title: `Email Error for ${project.name}`, 
            description: (aiErrorOrMailError as Error).message || "Could not generate or queue email notification."
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Assign Projects",
        description: (error as Error).message || "An unexpected error occurred.",
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
        title="User Management"
        icon={Users}
        subtitle="Administer user accounts, roles, and project assignments."
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
              <UserPlus className="mr-2 h-4 w-4" /> Add New User
            </Button>
          </UserFormDialog>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="user-search" className="mb-1 block text-sm font-medium">Search Users</Label>
            <Input
              id="user-search"
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="role-filter" className="mb-1 block text-sm font-medium">Filter by Role</Label>
            <Select value={roleFilter} onValueChange={(value: UserRole | 'ALL') => setRoleFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]" id="role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                {userRoleFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <Button variant="outline" onClick={() => { setSearchTerm(''); setRoleFilter('ALL');}} className="h-10">
            <Filter className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </div>

      {isLoadingUsers && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading users...
        </div>
      )}
      {usersError && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Error Loading Users</p>
           <p>{usersError}</p>
         </div>
      )}
      {!isLoadingUsers && !usersError && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          {isProcessingAssignment &&
            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing assignments...
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
         <div className="flex items-center justify-center p-4"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading projects for assignment...</div>
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
              <AlertDialogTitle>Confirm User Record Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the Firestore record for user "{userToDelete?.name}" (ID: {userToDelete?.id})?
              This action is irreversible and only deletes the app-specific data. The user's Firebase Authentication account will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    