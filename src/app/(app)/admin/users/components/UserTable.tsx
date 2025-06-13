
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
import type { User, UserRole } from '@/lib/types'; // Assuming these types are defined

// Mock data - replace with actual data fetching
const mockUsers: User[] = [
  { id: '1', name: 'Alice Wonderland', email: 'alice@example.com', role: 'ADMIN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'Bob The Builder', email: 'bob@example.com', role: 'SUPERVISOR', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: 'Charlie Technician', email: 'charlie@example.com', role: 'TECHNICIAN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'TECHNICIAN', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
  // In a real app, users would be fetched from an API
  const [users, setUsers] = React.useState<User[]>(mockUsers);

  const handleEdit = (user: User) => {
    console.log('Editing user:', user);
    onEditUser(user);
    // Here you would typically open a dialog pre-filled with user data
  };

  const handleDelete = (userId: string) => {
    console.log('Deleting user ID:', userId);
    onDeleteUser(userId);
    // Here you would typically show a confirmation dialog and then make an API call
    // For now, just filter out from mock data for demo
    // setUsers(prevUsers => prevUsers.filter(u => u.id !== userId)); 
    // ^ Deleting from mock data should be handled by a toast/confirmation in a real app
  };


  if (users.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No users found.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">User ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.id}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={roleBadgeVariant[user.role] || 'outline'}>{user.role}</Badge>
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
       {users.length > 5 && <TableCaption>A list of users in the system.</TableCaption>}
    </div>
  );
}

