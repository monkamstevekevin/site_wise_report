
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
  name: z.string().min(1, 'Le nom du matériau est requis').max(100, 'Le nom du matériau est trop long'),
  type: z.enum(['cement', 'asphalt', 'gravel', 'sand', 'other'], {
    required_error: 'Le type de matériau est requis.',
  }),
  minDensity: z.coerce.number().optional(),
  maxDensity: z.coerce.number().optional(),
  minTemperature: z.coerce.number().optional(),
  maxTemperature: z.coerce.number().optional(),
}).superRefine(({ minDensity, maxDensity, minTemperature, maxTemperature }, ctx) => {
  if (minDensity !== undefined && maxDensity !== undefined && minDensity > maxDensity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La densité min ne peut pas être supérieure à la densité max.',
      path: ['minDensity'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La densité max ne peut pas être inférieure à la densité min.',
      path: ['maxDensity'],
    });
  }
  if (minTemperature !== undefined && maxTemperature !== undefined && minTemperature > maxTemperature) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La température min ne peut pas être supérieure à la température max.',
      path: ['minTemperature'],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La température max ne peut pas être inférieure à la température min.',
      path: ['maxTemperature'],
    });
  }
});

export type MaterialFormData = z.infer<typeof materialFormSchema>;
export type MaterialSubmitData = {
  name: string;
  type: MaterialType;
  validationRules?: MaterialValidationRules;
};


interface MaterialFormDialogProps {
  children: React.ReactNode;
  materialToEdit?: Material;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: MaterialSubmitData, id?: string) => Promise<void>;
}

const materialTypeOptions: { value: MaterialType; label: string }[] = [
  { value: 'cement', label: 'Ciment' },
  { value: 'asphalt', label: 'Asphalte' },
  { value: 'gravel', label: 'Gravier' },
  { value: 'sand', label: 'Sable' },
  { value: 'other', label: 'Autre' },
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
    if (Object.keys(submitData.validationRules || {}).length === 0) {
        delete submitData.validationRules;
    }

    await onFormSubmit(submitData, materialToEdit?.id);
    setIsSubmitting(false);
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
          <DialogTitle>{materialToEdit ? 'Modifier le Matériau' : 'Ajouter un Nouveau Matériau'}</DialogTitle>
          <DialogDescription>
            {materialToEdit ? "Modifiez les détails du matériau ci-dessous." : "Entrez les détails du nouveau matériau et ses règles de validation."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Matériau</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Béton Haute Résistance C40" {...field} />
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
                  <FormLabel>Type de Matériau</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type de matériau" />
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
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><BarChart className="mr-2 h-4 w-4" />Règles de Densité (kg/m³, Optionnel)</h3>
                <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="minDensity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Densité Min</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Ex: 1400" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                        <FormLabel>Densité Max</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Ex: 1600" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Thermometer className="mr-2 h-4 w-4" />Règles de Température (°C, Optionnel)</h3>
                 <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="minTemperature"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Température Min</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Ex: 5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                        <FormLabel>Température Max</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="Ex: 30" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
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
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (materialToEdit ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {materialToEdit ? 'Enregistrer les Modifications' : 'Ajouter le Matériau'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

