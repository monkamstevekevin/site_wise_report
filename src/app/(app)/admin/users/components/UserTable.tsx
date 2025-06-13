
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { User, UserRole } from '@/lib/types'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const mockUsers: User[] = [
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

interface UserTableProps {
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  ADMIN: "destructive",
  SUPERVISOR: "default",
  TECHNICIAN: "secondary",
};


export function UserTable({ onEditUser, onDeleteUser }: UserTableProps) {
  const [users, setUsers] = React.useState<User[]>(mockUsers);

  const handleEdit = (user: User) => {
    console.log('Editing user:', user);
    const userToPass = {
      id: user.id,
      displayName: user.name, // Map User.name to UserFormData.displayName
      email: user.email,
      role: user.role,
    };
    onEditUser(userToPass as any); // Casting as UserFormData equivalent for the dialog
  };

  const handleDelete = (userId: string) => {
    console.log('Deleting user ID:', userId);
    onDeleteUser(userId);
  };


  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No users found.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-xs">{user.id}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${user.name[0]}`} alt={user.name} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={roleBadgeVariant[user.role] || 'outline'}>{user.role}</Badge>
              </TableCell>
              <TableCell className="text-xs">
                {user.assignedProjectIds && user.assignedProjectIds.length > 0 
                  ? user.assignedProjectIds.join(', ') 
                  : 'N/A'}
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
       {users.length > 5 && <TableCaption>A list of {users.length} users in the system.</TableCaption>}
    </div>
  );
}

