
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
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
import type { Project } from '@/lib/types';
import { Loader2, PlusCircle, Save, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name is too long'),
  location: z.string().min(1, 'Location is required').max(100, 'Location is too long'),
  description: z.string().max(500, 'Description is too long').optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED'], {
    required_error: 'Project status is required.',
  }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).superRefine(({ startDate, endDate }, ctx) => {
  if (startDate && endDate && endDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date cannot be before the start date.',
      path: ['endDate'],
    });
  }
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;
// This type will be used when submitting to the service, converting dates to ISO strings
export type ProjectSubmitData = Omit<ProjectFormData, 'startDate' | 'endDate'> & {
  startDate?: string;
  endDate?: string;
};


interface ProjectFormDialogProps {
  children: React.ReactNode; // Trigger button
  projectToEdit?: Project;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: ProjectSubmitData, id?: string) => Promise<void>; 
}

const projectStatusOptions: { value: Project['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'COMPLETED', label: 'Completed' },
];

export function ProjectFormDialog({ children, projectToEdit, open, onOpenChange, onFormSubmit }: ProjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
  });

  React.useEffect(() => {
    if (open) { 
      if (projectToEdit) {
        form.reset({
          name: projectToEdit.name || '',
          location: projectToEdit.location || '',
          description: projectToEdit.description || '',
          status: projectToEdit.status || 'ACTIVE',
          startDate: projectToEdit.startDate ? parseISO(projectToEdit.startDate) : undefined,
          endDate: projectToEdit.endDate ? parseISO(projectToEdit.endDate) : undefined,
        });
      } else {
        form.reset({ name: '', location: '', description: '', status: 'ACTIVE', startDate: undefined, endDate: undefined });
      }
    }
  }, [projectToEdit, form, open]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    const submitData: ProjectSubmitData = {
      ...data,
      startDate: data.startDate ? data.startDate.toISOString() : undefined,
      endDate: data.endDate ? data.endDate.toISOString() : undefined,
    };
    await onFormSubmit(submitData, projectToEdit?.id);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) {
        form.reset(projectToEdit ? {
            name: projectToEdit.name,
            location: projectToEdit.location,
            description: projectToEdit.description,
            status: projectToEdit.status,
            startDate: projectToEdit.startDate ? parseISO(projectToEdit.startDate) : undefined,
            endDate: projectToEdit.endDate ? parseISO(projectToEdit.endDate) : undefined,
        } : { name: '', location: '', description: '', status: 'ACTIVE', startDate: undefined, endDate: undefined });
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg"> {/* Increased width for date pickers */}
        <DialogHeader>
          <DialogTitle>{projectToEdit ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription>
            {projectToEdit ? "Modify the project's details below." : "Enter the details for the new project."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
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
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          (form.getValues("endDate") ? date > form.getValues("endDate")! : false) || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When the project is scheduled to begin.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          (form.getValues("startDate") ? date < form.getValues("startDate")! : false)
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When the project is scheduled to be completed.
                  </FormDescription>
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
