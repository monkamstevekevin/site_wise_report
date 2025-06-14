
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
import { Edit, Trash2, MoreVertical, Briefcase } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { User, UserRole } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserFormData } from './UserFormDialog'; // For typing onEditUser

interface UserTableProps {
  users: User[];
  onEditUser: (user: Partial<UserFormData> & { id: string }) => void; // Adjusted type
  onDeleteUser: (userId: string) => void;
  onAssignProjects: (user: User) => void; 
}

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline" | "destructive"> = {
  ADMIN: "destructive",
  SUPERVISOR: "default",
  TECHNICIAN: "secondary",
};


export function UserTable({ users, onEditUser, onDeleteUser, onAssignProjects }: UserTableProps) {

  const handleEdit = (user: User) => {
    const userToPass = {
      id: user.id,
      displayName: user.name, 
      email: user.email,
      role: user.role,
    };
    onEditUser(userToPass);
  };

  const handleDelete = (userId: string) => {
    onDeleteUser(userId);
  };


  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No users match the current filters.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>A list of {users.length > 5 ? `${users.length} users` : 'users'} in the system.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Assigned Projects (Count)</TableHead>
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
                {/* Ensure assignedProjectIds is treated as potentially undefined and default to 0 */}
                {user.assignedProjectIds ? user.assignedProjectIds.length : 0}
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
                      <Edit className="mr-2 h-4 w-4" /> Edit User (Simulated)
                    </DropdownMenuItem>
                     <DropdownMenuItem onClick={() => onAssignProjects(user)}>
                      <Briefcase className="mr-2 h-4 w-4" /> Assign Projects
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete User (Simulated)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

