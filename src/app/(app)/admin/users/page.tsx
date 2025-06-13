
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Users, UserPlus, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserFormDialog } from './components/UserFormDialog';
import { UserTable } from './components/UserTable';
import { AssignProjectsDialog } from './components/AssignProjectsDialog'; // New Dialog
import type { User, UserRole, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { mockProjectsData } from '@/app/(app)/admin/projects/page'; // For all projects list
import { sendAssignmentNotification } from '@/ai/flows/assignment-notification-flow'; // New flow

// Using a state for mockUsersData to allow updates
const initialMockUsersData: User[] = [
  {
    id: 'USR001',
    name: 'Dr. Eleanor Vance',
    email: 'eleanor.vance@example.com',
    role: 'ADMIN',
    avatarUrl: 'https://placehold.co/100x100.png?text=EV',
    assignedProjectIds: ['PJT001', 'PJT002'],
    createdAt: new Date('2023-01-15T09:30:00Z').toISOString(),
    updatedAt: new Date('2023-10-20T14:00:00Z').toISOString()
  },
  {
    id: 'USR002',
    name: 'Marcus Rivera',
    email: 'marcus.rivera@example.com',
    role: 'SUPERVISOR',
    avatarUrl: 'https://placehold.co/100x100.png?text=MR',
    assignedProjectIds: ['PJT001', 'PJT003', 'PJT004'],
    createdAt: new Date('2023-02-20T11:00:00Z').toISOString(),
    updatedAt: new Date('2023-11-01T10:15:00Z').toISOString()
  },
  {
    id: 'USR003',
    name: 'Aisha Khan',
    email: 'aisha.khan@example.com',
    role: 'TECHNICIAN',
    avatarUrl: 'https://placehold.co/100x100.png?text=AK',
    assignedProjectIds: ['PJT002'],
    createdAt: new Date('2023-03-10T14:45:00Z').toISOString(),
    updatedAt: new Date('2023-03-10T14:45:00Z').toISOString()
  },
  {
    id: 'USR004',
    name: 'David Lee',
    email: 'david.lee@example.com',
    role: 'TECHNICIAN',
    avatarUrl: 'https://placehold.co/100x100.png?text=DL',
    assignedProjectIds: ['PJT003'],
    createdAt: new Date('2023-04-05T08:00:00Z').toISOString(),
    updatedAt: new Date('2023-09-15T16:30:00Z').toISOString()
  },
  {
    id: 'USR005',
    name: 'Sofia Chen',
    email: 'sofia.chen@example.com',
    role: 'SUPERVISOR',
    avatarUrl: 'https://placehold.co/100x100.png?text=SC',
    assignedProjectIds: ['PJT004', 'PJT005'],
    createdAt: new Date('2023-05-01T10:20:00Z').toISOString(),
    updatedAt: new Date('2023-10-25T11:00:00Z').toISOString()
  },
   {
    id: 'USR006',
    name: 'Robert Downy',
    email: 'robert.d@example.com',
    role: 'TECHNICIAN',
    avatarUrl: 'https://placehold.co/100x100.png?text=RD',
    assignedProjectIds: ['PJT005'],
    createdAt: new Date('2023-06-11T12:10:00Z').toISOString(),
    updatedAt: new Date('2023-06-11T12:10:00Z').toISOString()
  },
];

const userRoleFilterOptions: { value: UserRole | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export default function UserManagementPage() {
  const [usersData, setUsersData] = useState<User[]>(initialMockUsersData);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> & {displayName?: string} | undefined>(undefined);
  
  const [isAssignProjectsDialogOpen, setIsAssignProjectsDialogOpen] = useState(false);
  const [userToAssignProjects, setUserToAssignProjects] = useState<User | null>(null);
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);

  const { toast } = useToast();
  const { user: adminUser } = useAuth(); // Admin performing the action

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  const handleAddNewUser = () => {
    setEditingUser(undefined);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: Partial<User> & {displayName?: string}) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    // Simulate deletion
    setUsersData(prevUsers => prevUsers.filter(user => user.id !== userId));
    toast({
      title: "User Deleted (Simulated)",
      description: `User ${userId} has been removed from the list.`,
      variant: "destructive"
    });
  };

  const handleOpenAssignProjectsDialog = (user: User) => {
    setUserToAssignProjects(user);
    setIsAssignProjectsDialogOpen(true);
  };

  const handleAssignProjects = async (userId: string, selectedProjectIds: string[]) => {
    setIsProcessingAssignment(true);
    const targetUser = usersData.find(u => u.id === userId);
    if (!targetUser || !adminUser) {
      toast({ variant: "destructive", title: "Error", description: "User or admin not found."});
      setIsProcessingAssignment(false);
      return;
    }

    const oldProjectIds = new Set(targetUser.assignedProjectIds || []);
    const newProjectIds = new Set(selectedProjectIds);

    const newlyAssignedProjects = selectedProjectIds
      .filter(id => !oldProjectIds.has(id))
      .map(id => mockProjectsData.find(p => p.id === id))
      .filter(p => p !== undefined) as Project[];

    // Simulate updating user data
    setUsersData(prevUsers =>
      prevUsers.map(u =>
        u.id === userId ? { ...u, assignedProjectIds: selectedProjectIds, updatedAt: new Date().toISOString() } : u
      )
    );
    
    toast({
      title: "Projects Assigned",
      description: `${targetUser.name} has been assigned ${newlyAssignedProjects.length} new project(s).`,
    });

    for (const project of newlyAssignedProjects) {
      try {
        const notificationContent = await sendAssignmentNotification({
          userName: targetUser.name,
          userEmail: targetUser.email,
          projectName: project.name,
          projectLocation: project.location,
          assignerName: adminUser.displayName || adminUser.email || "Admin",
        });
        
        toast({
          duration: 10000, // Longer toast to read email content
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
    setIsProcessingAssignment(false);
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
            onOpenChange={setIsUserFormOpen}
            userToEdit={editingUser}
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

      <AssignProjectsDialog
        open={isAssignProjectsDialogOpen}
        onOpenChange={setIsAssignProjectsDialogOpen}
        user={userToAssignProjects}
        allProjects={mockProjectsData}
        onAssignProjects={handleAssignProjects}
      />
    </>
  );
}
