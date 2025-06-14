
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
// import { useToast } from '@/hooks/use-toast'; // No longer used directly here for submit toast
import type { Project } from '@/lib/types';
import { Loader2, PlusCircle, Save } from 'lucide-react';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  location: z.string().min(1, 'Location is required').max(100, 'Location is too long'),
  description: z.string().max(500, 'Description is too long').optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED'], {
    required_error: 'Project status is required.',
  }),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormDialogProps {
  children: React.ReactNode; // Trigger button
  projectToEdit?: Partial<ProjectFormData> & { id?: string }; // For editing existing projects
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: ProjectFormData, id?: string) => Promise<void>; // Changed: No longer optional
}

const projectStatusOptions: { value: Project['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function ProjectFormDialog({ children, projectToEdit, open, onOpenChange, onFormSubmit }: ProjectFormDialogProps) {
  // const { toast } = useToast(); // Moved to parent page
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { // Ensure default values are always set
      name: projectToEdit?.name || '',
      location: projectToEdit?.location || '',
      description: projectToEdit?.description || '',
      status: projectToEdit?.status || 'ACTIVE',
    },
  });

  React.useEffect(() => {
    if (open) { // Only reset form when dialog opens or projectToEdit changes
      if (projectToEdit) {
        form.reset({
          name: projectToEdit.name || '',
          location: projectToEdit.location || '',
          description: projectToEdit.description || '',
          status: projectToEdit.status || 'ACTIVE',
        });
      } else {
        form.reset({ name: '', location: '', description: '', status: 'ACTIVE' });
      }
    }
  }, [projectToEdit, form, open]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    // The actual submission logic (calling Firestore service) is handled by the onFormSubmit prop in the parent component
    await onFormSubmit(data, projectToEdit?.id);
    setIsSubmitting(false);
    // onOpenChange?.(false); // Parent component (projects/page.tsx) now handles closing dialog
    // form.reset(); // Parent component handles resetting or dialog unmounts
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) { // If dialog is closing, reset the form for next time
        form.reset(projectToEdit || { name: '', location: '', description: '', status: 'ACTIVE' });
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{projectToEdit ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription>
            {projectToEdit ? "Modify the project's details below." : "Enter the details for the new project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Downtown Tower Renovation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Springfield, IL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief overview of the project..." {...field} value={field.value || ''} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'ACTIVE'} defaultValue={field.value || 'ACTIVE'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectStatusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (projectToEdit ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {projectToEdit ? 'Save Changes' : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

