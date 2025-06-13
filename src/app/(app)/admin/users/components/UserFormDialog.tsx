
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types'; // Assuming UserRole is defined
import { Loader2, UserPlus, Save } from 'lucide-react';

const userFormSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN'], {
    required_error: 'Role is required.',
  }),
  // password: z.string().min(6, 'Password must be at least 6 characters').optional(), // Only for new user creation
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  children: React.ReactNode; // Trigger button
  userToEdit?: Partial<UserFormData> & { id?: string }; // For editing existing users
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export function UserFormDialog({ children, userToEdit, open, onOpenChange }: UserFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: userToEdit || {
      displayName: '',
      email: '',
      role: 'TECHNICIAN',
    },
  });

  React.useEffect(() => {
    if (userToEdit) {
      form.reset(userToEdit);
    } else {
      form.reset({ displayName: '', email: '', role: 'TECHNICIAN' });
    }
  }, [userToEdit, form]);

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    console.log('User form data:', data);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: userToEdit ? 'User Updated (Simulated)' : 'User Added (Simulated)',
      description: `${data.displayName} has been ${userToEdit ? 'updated' : 'added'}. In a real app, this would interact with Firebase Auth and a database.`,
    });
    setIsSubmitting(false);
    onOpenChange?.(false); // Close dialog on success
    form.reset(); // Reset form for next use
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{userToEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {userToEdit ? "Modify the user's details below." : "Enter the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="e.g., user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userRoleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 
            {!userToEdit && ( // Password field only for new user creation
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Min. 6 characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            */}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (userToEdit ? <Save className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4" />)}
                {userToEdit ? 'Save Changes' : 'Add User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
