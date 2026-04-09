
'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Project, Material } from '@/lib/types';
import { Loader2, PlusCircle, Save, CalendarIcon, TestTube2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const projectFormSchema = z.object({
  name: z.string().min(1, 'Le nom du projet est requis').max(100, 'Le nom du projet est trop long'),
  location: z.string().min(1, 'La localisation est requise').max(100, 'La localisation est trop longue'),
  description: z.string().max(500, 'La description est trop longue').optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPLETED'], {
    required_error: 'Le statut du projet est requis.',
  }),
  projectType: z.enum(['OPEN', 'VISITS', 'HOURS']).default('OPEN'),
  targetVisits: z.coerce.number().int().min(1).optional().nullable(),
  targetHours: z.coerce.number().min(0.5).optional().nullable(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  assignedMaterialIds: z.array(z.string()).optional().default([]),
}).superRefine(({ startDate, endDate }, ctx) => {
  if (startDate && endDate && endDate < startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La date de fin ne peut pas être antérieure à la date de début.',
      path: ['endDate'],
    });
  }
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormDialogProps {
  children: React.ReactNode;
  projectToEdit?: Project;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFormSubmit: (data: ProjectFormData, id?: string) => Promise<void>;
  allMaterials: Material[];
}

const projectStatusOptions: { value: Project['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'COMPLETED', label: 'Terminé' },
];

const projectTypeOptions: { value: 'OPEN' | 'VISITS' | 'HOURS'; label: string }[] = [
  { value: 'OPEN', label: 'Libre (sans cible)' },
  { value: 'VISITS', label: 'Par nombre de visites' },
  { value: 'HOURS', label: "Par nombre d'heures" },
];


export function ProjectFormDialog({ children, projectToEdit, open, onOpenChange, onFormSubmit, allMaterials }: ProjectFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
      status: 'ACTIVE',
      projectType: 'OPEN',
      targetVisits: null,
      targetHours: null,
      startDate: undefined,
      endDate: undefined,
      assignedMaterialIds: [],
    }
  });

  const watchedProjectType = form.watch('projectType');

  React.useEffect(() => {
    if (open) {
      if (projectToEdit) {
        form.reset({
          name: projectToEdit.name || '',
          location: projectToEdit.location || '',
          description: projectToEdit.description || '',
          status: projectToEdit.status || 'ACTIVE',
          projectType: projectToEdit.projectType || 'OPEN',
          targetVisits: projectToEdit.targetVisits ?? null,
          targetHours: projectToEdit.targetHours ?? null,
          startDate: projectToEdit.startDate ? parseISO(projectToEdit.startDate) : undefined,
          endDate: projectToEdit.endDate ? parseISO(projectToEdit.endDate) : undefined,
          assignedMaterialIds: projectToEdit.assignedMaterialIds || [],
        });
      } else {
        form.reset({ name: '', location: '', description: '', status: 'ACTIVE', projectType: 'OPEN', targetVisits: null, targetHours: null, startDate: undefined, endDate: undefined, assignedMaterialIds: [] });
      }
    }
  }, [projectToEdit, form, open]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    await onFormSubmit(data, projectToEdit?.id);
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
            projectType: projectToEdit.projectType || 'OPEN',
            targetVisits: projectToEdit.targetVisits ?? null,
            targetHours: projectToEdit.targetHours ?? null,
            startDate: projectToEdit.startDate ? parseISO(projectToEdit.startDate) : undefined,
            endDate: projectToEdit.endDate ? parseISO(projectToEdit.endDate) : undefined,
            assignedMaterialIds: projectToEdit.assignedMaterialIds || [],
        } : { name: '', location: '', description: '', status: 'ACTIVE', projectType: 'OPEN', targetVisits: null, targetHours: null, startDate: undefined, endDate: undefined, assignedMaterialIds: [] });
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{projectToEdit ? 'Modifier le Projet' : 'Ajouter un Nouveau Projet'}</DialogTitle>
          <DialogDescription>
            {projectToEdit ? "Modifiez les détails du projet ci-dessous." : "Entrez les détails du nouveau projet."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Projet</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rénovation Tour Centre-Ville" {...field} />
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
                  <FormLabel>Localisation</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Springfield, IL" {...field} />
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
                  <FormLabel>Date de Début (Optionnel)</FormLabel>
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
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
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
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Quand le projet est prévu pour commencer.
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
                  <FormLabel>Date de Fin (Optionnel)</FormLabel>
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
                            format(field.value, "PPP", { locale: fr })
                          ) : (
                            <span>Choisir une date</span>
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
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Quand le projet est prévu pour être terminé.
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
                  <FormLabel>Description (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bref aperçu du projet..." {...field} value={field.value || ''} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedMaterialIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base flex items-center">
                        <TestTube2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        Assigner des Matériaux au Projet (Optionnel)
                    </FormLabel>
                    <FormDescription>
                      Sélectionnez quels matériaux spécifiques (de la Gestion des Matériaux) sont prévus pour être testés pour ce projet.
                    </FormDescription>
                  </div>
                  {allMaterials.length > 0 ? (
                    <ScrollArea className="h-40 border rounded-md p-2">
                      <div className="grid grid-cols-1 gap-x-4 gap-y-2">
                      {allMaterials.map((material) => (
                        <FormField
                          key={material.id}
                          control={form.control}
                          name="assignedMaterialIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={material.id}
                                className="flex flex-row items-center space-x-2 space-y-0 p-1 hover:bg-muted/50 rounded"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(material.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, material.id])
                                        : field.onChange(
                                            currentValue.filter(
                                              (value) => value !== material.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer w-full">
                                  {material.name} <span className="text-xs text-muted-foreground">({material.type})</span>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun matériau défini dans la Gestion des Matériaux. Ajoutez des matériaux d'abord pour les assigner ici.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'ACTIVE'} defaultValue={field.value || 'ACTIVE'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le statut du projet" />
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
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de projet</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'OPEN'} defaultValue={field.value || 'OPEN'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type de projet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedProjectType === 'VISITS' && (
              <FormField
                control={form.control}
                name="targetVisits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de visites prévu</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Ex: 20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {watchedProjectType === 'HOURS' && (
              <FormField
                control={form.control}
                name="targetHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d&apos;heures prévu</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        placeholder="Ex: 100"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || allMaterials.length === 0 && !projectToEdit} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (projectToEdit ? <Save className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4" />)}
                {projectToEdit ? 'Enregistrer les Modifications' : 'Ajouter le Projet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

