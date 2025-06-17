
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  displayName: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  email: z.string().email('Adresse e-mail invalide'),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN'], {
    required_error: 'Le rôle est requis.',
  }),
  password: z.union([
    z.string().length(0, { message: "Le mot de passe ne doit pas être une chaîne vide s'il est fourni." }),
    z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères')
  ]).optional(),
  confirmPassword: z.string().optional(),
}).superRefine(({ confirmPassword, password, ...rest }, ctx) => {
  if (password && password.length > 0) {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
      });
    }
    if (!confirmPassword) { 
        ctx.addIssue({
            code: "custom",
            message: "Veuillez confirmer votre mot de passe",
            path: ["confirmPassword"],
        });
    }
  }
});


export type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
  children: React.ReactNode;
  userToEdit?: Partial<UserFormData> & { id?: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: Partial<UserFormData> & { password?: string }, id?: string) => Promise<void>;
}

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'SUPERVISOR', label: 'Superviseur' },
  { value: 'TECHNICIAN', label: 'Technicien' },
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
          password: '',
          confirmPassword: '',
        });
      } else {
        form.reset({ displayName: '', email: '', role: 'TECHNICIAN', password: '', confirmPassword: '' });
      }
    }
  }, [userToEdit, form, open]);

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);

    if (!userToEdit) { 
      if (!data.password || data.password.length < 6) {
         form.setError("password", { type: "manual", message: "Le mot de passe est requis et doit comporter au moins 6 caractères."});
         setIsSubmitting(false);
         return; 
      }
      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Les mots de passe ne correspondent pas."});
        setIsSubmitting(false);
        return; 
      }
    }

    const dataToSend: Partial<UserFormData> & { password?: string } = {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
    };

    if (!userToEdit && data.password) {
        dataToSend.password = data.password;
    }

    try {
      await onFormSubmit(dataToSend, userToEdit?.id);
    } catch (error) {
      console.error("Erreur de soumission UserFormDialog:", error);
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
          <DialogTitle>{userToEdit ? 'Modifier l\'Utilisateur' : 'Ajouter un Nouvel Utilisateur'}</DialogTitle>
          <DialogDescription>
            {userToEdit ? "Modifiez les détails de l'utilisateur ci-dessous." : "Entrez les détails du nouvel utilisateur."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom Complet</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Jean Dupont" {...field} />
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
                  <FormLabel>Adresse Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Ex: utilisateur@example.com" {...field} disabled={!!userToEdit} />
                  </FormControl>
                  {!!userToEdit && <FormMessage>L'email ne peut pas être modifié après la création.</FormMessage>}
                  {!userToEdit && <FormMessage />} 
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle de l'Utilisateur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
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
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Min. 6 caractères" {...field} />
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
                      <FormLabel>Confirmer le Mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Retapez le mot de passe" {...field} />
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
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (userToEdit ? <Save className="mr-2 h-4 w-4"/> : <UserPlus className="mr-2 h-4 w-4" />)}
                {userToEdit ? 'Enregistrer les Modifications' : 'Ajouter l\'Utilisateur'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

