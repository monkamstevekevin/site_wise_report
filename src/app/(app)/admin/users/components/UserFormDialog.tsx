
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

// Ajustement du schéma Zod pour le mot de passe
const userFormSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN'], {
    required_error: 'Role is required.',
  }),
  // Permet une chaîne vide OU une chaîne d'au moins 6 caractères, OU undefined
  password: z.union([
    z.string().length(0, { message: "Password should not be an empty string if provided." }), // Disallow "" if not optional, but allow optional
    z.string().min(6, 'Password must be at least 6 characters')
  ]).optional(),
  confirmPassword: z.string().optional(),
}).superRefine(({ confirmPassword, password, ...rest }, ctx) => {
  // Cette superRefine s'appliquera si un mot de passe est effectivement fourni et n'est pas une chaîne vide.
  // La validation de l'obligation du mot de passe pour la création se fera dans onSubmit.
  if (password && password.length > 0) {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
    if (!confirmPassword) { // Si un mot de passe est fourni, la confirmation l'est aussi.
        ctx.addIssue({
            code: "custom",
            message: "Please confirm your password",
            path: ["confirmPassword"],
        });
    }
  }
});


export type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  children: React.ReactNode; // Trigger button
  userToEdit?: Partial<UserFormData> & { id?: string }; // For editing existing users
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: Partial<UserFormData> & { password?: string }, id?: string) => Promise<void>;
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
      password: '', // Laissé vide, le schéma optionnel et length(0) devrait le gérer
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
          password: '', // Les mots de passe ne sont pas pré-remplis pour l'édition
          confirmPassword: '',
        });
      } else {
        // Pour un nouvel utilisateur, on peut laisser les mots de passe vides pour que l'utilisateur les remplisse
        form.reset({ displayName: '', email: '', role: 'TECHNICIAN', password: '', confirmPassword: '' });
      }
    }
  }, [userToEdit, form, open]);

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);

    // Validation spécifique pour le mode création
    if (!userToEdit) { // Mode Création
      if (!data.password || data.password.length < 6) {
         form.setError("password", { type: "manual", message: "Password is required and must be at least 6 characters."});
         setIsSubmitting(false);
         return; 
      }
      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Passwords do not match."});
        setIsSubmitting(false);
        return; 
      }
    }

    // Préparer les données pour onFormSubmit
    const dataToSend: Partial<UserFormData> & { password?: string } = {
        displayName: data.displayName,
        email: data.email, // L'email n'est pas modifiable en édition via ce formulaire mais fait partie des données
        role: data.role,
    };

    if (!userToEdit && data.password) {
        dataToSend.password = data.password;
    }
    // Exclure confirmPassword n'est plus nécessaire car dataToSend est construit explicitement

    try {
      await onFormSubmit(dataToSend, userToEdit?.id);
    } catch (error) {
      console.error("UserFormDialog submission error:", error);
      // Le toast d'erreur est géré par la page parente via le catch de onFormSubmit
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
                  {!userToEdit && <FormMessage />} 
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
