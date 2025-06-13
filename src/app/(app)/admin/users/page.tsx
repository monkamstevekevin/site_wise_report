
'use client';

import React, { useState } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserFormDialog } from './components/UserFormDialog';
import { UserTable } from './components/UserTable';
import type { User } from '@/lib/types'; // Assuming User type is defined
import { useToast } from '@/hooks/use-toast';

export default function UserManagementPage() {
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const { toast } = useToast();

  const handleAddNewUser = () => {
    setEditingUser(undefined); // Ensure we are in "add" mode
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };
  
  const handleDeleteUser = (userId: string) => {
    // Implement actual deletion logic here, e.g., API call, show confirmation
    console.log("Attempting to delete user ID:", userId);
    toast({
      title: "Delete Action (Simulated)",
      description: `If implemented, user ${userId} would be deleted.`,
      variant: "destructive"
    });
  };

  return (
    <>
      <PageTitle 
        title="User Management" 
        icon={Users}
        subtitle="Administer user accounts, roles, and permissions."
        actions={
          // The UserFormDialog now contains its own trigger
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
      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <UserTable onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />
      </div>
    </>
  );
}

