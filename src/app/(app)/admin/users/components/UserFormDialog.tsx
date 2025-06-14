
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // No longer directly used for form fields
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
import type { UserRole } from '@/lib/types';
import { Loader2, UserPlus, Save } from 'lucide-react';

const userFormSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN'], {
    required_error: 'Role is required.',
  }),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  confirmPassword: z.string().optional(),
}).superRefine(({ confirmPassword, password, ...rest }, ctx) => {
  // This superRefine will only trigger if both password and confirmPassword fields are attempted.
  // If we are editing a user, password fields won't be there, so this won't run.
  // If we are creating a new user and password is provided, confirmPassword must match.
  if (password && confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
  }
  // If password is provided (new user) but confirmPassword is not
  if (password && !confirmPassword) {
    ctx.addIssue({
        code: "custom",
        message: "Please confirm your password",
        path: ["confirmPassword"],
    });
  }
});


export type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  children: React.ReactNode; // Trigger button
  userToEdit?: Partial<UserFormData> & { id?: string }; // For editing existing users
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Allow password to be passed if it's a new user creation
  onFormSubmit: (data: UserFormData & { password?: string }, id?: string) => Promise<void>;
}

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export function UserFormDialog({ children, userToEdit, open, onOpenChange, onFormSubmit }: UserFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      role: 'TECHNICIAN',
      password: '',
      confirmPassword: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (userToEdit) {
        form.reset({
          displayName: userToEdit.displayName || '',
          email: userToEdit.email || '',
          role: userToEdit.role || 'TECHNICIAN',
          password: '', // Passwords are not pre-filled for editing
          confirmPassword: '',
        });
      } else {
        form.reset({ displayName: '', email: '', role: 'TECHNICIAN', password: '', confirmPassword: '' });
      }
    }
  }, [userToEdit, form, open]);

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);

    const { confirmPassword, ...submissionData } = data; // Exclude confirmPassword from submitted data

    if (!userToEdit && (!submissionData.password || submissionData.password.length < 6)) {
         form.setError("password", { type: "manual", message: "Password is required and must be at least 6 characters."});
         setIsSubmitting(false);
         return;
    }
     if (!userToEdit && submissionData.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Passwords do not match."});
        setIsSubmitting(false);
        return;
    }

    try {
      // Pass password only if it's a new user and password is set
      const passwordToSend = !userToEdit && submissionData.password ? submissionData.password : undefined;
      const dataToSend = { ...submissionData, password: passwordToSend };
      
      await onFormSubmit(dataToSend, userToEdit?.id);
      // Closing dialog and resetting form is handled by parent via onOpenChange or after submit success
    } catch (error) {
      // Error is usually handled by the parent's onFormSubmit toast
      console.error("UserFormDialog submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) {
         form.reset(userToEdit ? {
            displayName: userToEdit.displayName || '',
            email: userToEdit.email || '',
            role: userToEdit.role || 'TECHNICIAN',
            password: '',
            confirmPassword: '',
        } : { displayName: '', email: '', role: 'TECHNICIAN', password: '', confirmPassword: '' });
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
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
                    <Input type="email" placeholder="e.g., user@example.com" {...field} disabled={!!userToEdit} />
                  </FormControl>
                  {!!userToEdit && <FormMessage>Email cannot be changed after creation.</FormMessage>}
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
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
            {!userToEdit && (
              <>
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
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Retype password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
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
