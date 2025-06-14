
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
import { getUsers, addUser, updateUserAssignedProjects } from '@/services/userService'; 
import { sendAssignmentNotification } from '@/ai/flows/assignment-notification-flow';

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

  const handleEditUser = (user: Partial<UserFormData> & { id?: string }) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
     toast({ title: "Edit User (Simulated)", description: `Editing for ${user.displayName} will be connected to Firestore soon.` });
  };

  const handleDeleteUser = (userId: string) => {
    toast({
      title: "Delete User (Simulated)",
      description: `User ${userId} deletion will be connected to Firestore soon.`,
      variant: "destructive"
    });
  };

  const handleUserFormSubmit = async (data: UserFormData & { password?: string }, id?: string) => {
    setIsUserFormOpen(false);

    if (id) { 
      try {
        // await updateUser(id, data); // Placeholder for updateUserService function
        toast({
          title: "User Update (Simulated)",
          description: `User "${data.displayName}" update will be implemented soon.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Update User (Simulated)",
          description: (err as Error).message || "An unexpected error occurred.",
        });
      }
    } else { 
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
    const newlyAssignedProjects = selectedProjectIds
      .filter(id => !oldProjectIds.has(id))
      .map(id => allProjects.find(p => p.id === id))
      .filter(p => p !== undefined) as Project[];
    
    try {
      await updateUserAssignedProjects(userId, selectedProjectIds);
      toast({
        title: "Projects Assigned Successfully",
        description: `${targetUser.name}'s project assignments have been updated.`,
      });
      await fetchUsers(); // Refresh user list to show updated count

      for (const project of newlyAssignedProjects) {
        try {
          const notificationContent = await sendAssignmentNotification({
            userName: targetUser.name,
            userEmail: targetUser.email,
            projectName: project.name,
            projectLocation: project.location,
            assignerName: adminAuthUser.displayName || adminAuthUser.email || "Admin",
          });
          
          toast({
            duration: 10000, 
            title: `Simulated Email for ${project.name}`,
            description: (
              <div className="text-xs">
                <p className="font-semibold">To: {targetUser.email}</p>
                <p className="font-semibold">Subject: {notificationContent.emailSubject}</p>
                <p className="mt-2 whitespace-pre-wrap">{notificationContent.emailBody}</p>
              </div>
            ),
          });
        } catch (error) {
          console.error("Error generating assignment email:", error);
          toast({ variant: "destructive", title: `Email Gen Error for ${project.name}`, description: "Could not simulate email notification."});
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
      setIsAssignProjectsDialogOpen(false); // Close dialog on completion or error
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
            onDeleteUser={handleDeleteUser}
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
    </>
  );
}

