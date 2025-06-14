
'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import type { Material, MaterialType, MaterialValidationRules } from '@/lib/types';
import { Loader2, PlusCircle, Save, Thermometer, BarChart } from 'lucide-react';

const materialFormSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(100, 'Material name is too long'),
  type: z.enum(['cement', 'asphalt', 'gravel', 'sand', 'other'], {
    required_error: 'Material type is required.',
  }),
  minDensity: z.coerce.number().optional(),
  maxDensity: z.coerce.number().optional(),
  minTemperature: z.coerce.number().optional(),
  maxTemperature: z.coerce.number().optional(),
}).superRefine(({ minDensity, maxDensity, minTemperature, maxTemperature }, ctx) => {
  if (minDensity !== undefined && maxDensity !== undefined && minDensity > maxDensity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Min density cannot be greater than max density.',
      path: ['minDensity'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Max density cannot be less than min density.',
      path: ['maxDensity'],
    });
  }
  if (minTemperature !== undefined && maxTemperature !== undefined && minTemperature > maxTemperature) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Min temperature cannot be greater than max temperature.',
      path: ['minTemperature'],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Max temperature cannot be less than min temperature.',
      path: ['maxTemperature'],
    });
  }
});

export type MaterialFormData = z.infer<typeof materialFormSchema>;
// This will be the type submitted to the service, including the nested validationRules
export type MaterialSubmitData = {
  name: string;
  type: MaterialType;
  validationRules?: MaterialValidationRules;
};


interface MaterialFormDialogProps {
  children: React.ReactNode; // Trigger button
  materialToEdit?: Material;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: MaterialSubmitData, id?: string) => Promise<void>;
}

const materialTypeOptions: { value: MaterialType; label: string }[] = [
  { value: 'cement', label: 'Cement' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'other', label: 'Other' },
];

export function MaterialFormDialog({ children, materialToEdit, open, onOpenChange, onFormSubmit }: MaterialFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: '',
      type: 'other',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (materialToEdit) {
        form.reset({
          name: materialToEdit.name || '',
          type: materialToEdit.type || 'other',
          minDensity: materialToEdit.validationRules?.minDensity,
          maxDensity: materialToEdit.validationRules?.maxDensity,
          minTemperature: materialToEdit.validationRules?.minTemperature,
          maxTemperature: materialToEdit.validationRules?.maxTemperature,
        });
      } else {
        form.reset({ name: '', type: 'other', minDensity: undefined, maxDensity: undefined, minTemperature: undefined, maxTemperature: undefined });
      }
    }
  }, [materialToEdit, form, open]);

  const onSubmit = async (data: MaterialFormData) => {
    setIsSubmitting(true);
    const submitData: MaterialSubmitData = {
      name: data.name,
      type: data.type,
      validationRules: {
        ...(data.minDensity !== undefined && { minDensity: data.minDensity }),
        ...(data.maxDensity !== undefined && { maxDensity: data.maxDensity }),
        ...(data.minTemperature !== undefined && { minTemperature: data.minTemperature }),
        ...(data.maxTemperature !== undefined && { maxTemperature: data.maxTemperature }),
      },
    };
    // Remove validationRules if it's empty
    if (Object.keys(submitData.validationRules || {}).length === 0) {
        delete submitData.validationRules;
    }

    await onFormSubmit(submitData, materialToEdit?.id);
    setIsSubmitting(false);
    // Dialog closing and form reset is handled by onOpenChange or useEffect in parent
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) {
        form.reset(materialToEdit ? {
            name: materialToEdit.name,
            type: materialToEdit.type,
            minDensity: materialToEdit.validationRules?.minDensity,
            maxDensity: materialToEdit.validationRules?.maxDensity,
            minTemperature: materialToEdit.validationRules?.minTemperature,
            maxTemperature: materialToEdit.validationRules?.maxTemperature,
        } : { name: '', type: 'other', minDensity: undefined, maxDensity: undefined, minTemperature: undefined, maxTemperature: undefined });
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{materialToEdit ? 'Edit Material' : 'Add New Material'}</DialogTitle>
          <DialogDescription>
            {materialToEdit ? "Modify the material's details below." : "Enter the details for the new material and its validation rules."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., High-Strength Concrete C40" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materialTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><BarChart className="mr-2 h-4 w-4" />Density Rules (kg/m³, Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="minDensity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Min Density</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 1400" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maxDensity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Density</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 1600" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Thermometer className="mr-2 h-4 w-4" />Temperature Rules (°C, Optional)</h3>
                 <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="minTemperature"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Min Temperature</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maxTemperature"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Max Temperature</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (materialToEdit ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {materialToEdit ? 'Save Changes' : 'Add Material'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

