
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import type { FieldReport } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangleIcon, Camera, Paperclip, Save, Send, X, FlaskConical, Info } from 'lucide-react';
import Image from 'next/image';
import { getProjects } from '@/services/projectService';
import type { Project, MaterialType, SamplingMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserById } from '@/services/userService';
import { getTestTypesForProject } from '@/services/testTypeService';
import type { TestType, TestFieldDef } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { CompactionHeaderForm } from '@/components/compaction/CompactionHeaderForm';
import { CompactionTestTable, type CompactionRowDraft } from '@/components/compaction/CompactionTestTable';
import type { CompactionReportData } from '@/db/schema';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const reportFormSchema = z.object({
  projectId: z.string().min(1, 'L\'ID du projet est requis'),
  materialType: z.enum(['cement', 'asphalt', 'gravel', 'sand', 'other', 'compaction'], {
    required_error: 'Le type de matériau est requis.',
  }),
  temperature: z.coerce.number().min(-50, "Trop bas").max(200, "Trop élevé"),
  volume: z.coerce.number().positive('Le volume doit être positif'),
  density: z.coerce.number().positive('La densité doit être positive'),
  humidity: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
  batchNumber: z.string().min(1, 'Le numéro de lot est requis'),
  supplier: z.string().min(1, 'Le fournisseur est requis'),
  samplingMethod: z.enum(['grab', 'composite', 'core', 'other'], {
    required_error: 'La méthode d\'échantillonnage est requise.',
  }),
  notes: z.string().optional(),
  photo: z
    .custom<FileList>()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES,
      `La taille maximale de l'image est de ${MAX_FILE_SIZE_MB}Mo.`
    )
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Seuls les formats .jpg, .jpeg, .png et .webp sont pris en charge."
    ),
  attachmentUrls: z.string().optional().describe('URLs séparées par des virgules pour d\'autres pièces jointes comme des documents'),
});

export type ReportFormData = z.infer<typeof reportFormSchema>;

export type ReportSubmitPayload = Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'photoDataUri'> & {
  testTypeId?: string | null;
  testData?: Record<string, unknown> | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  CONCRETE: 'Béton', SOIL: 'Sol', ASPHALT: 'Asphalte',
  GRANULAT: 'Granulats', CEMENT: 'Ciment', FIELD: 'Terrain',
};

const initialReportFormValues: ReportFormData = {
  projectId: '',
  materialType: undefined as unknown as ReportFormData['materialType'],
  temperature: '' as unknown as number,
  volume: '' as unknown as number,
  density: '' as unknown as number,
  humidity: '' as unknown as number,
  batchNumber: '',
  supplier: '',
  samplingMethod: undefined as unknown as ReportFormData['samplingMethod'],
  notes: '',
  photo: undefined,
  attachmentUrls: '',
};

const materialTypeOptions: { value: MaterialType | 'compaction'; label: string }[] = [
  { value: 'cement', label: 'Ciment' },
  { value: 'asphalt', label: 'Asphalte' },
  { value: 'gravel', label: 'Gravier' },
  { value: 'sand', label: 'Sable' },
  { value: 'other', label: 'Autre' },
  { value: 'compaction', label: 'Contrôle de compacité' },
];

const samplingMethodOptions: { value: SamplingMethod; label: string }[] = [
  { value: 'grab', label: 'Échantillon Instantané' },
  { value: 'composite', label: 'Échantillon Composite' },
  { value: 'core', label: 'Carottage' },
  { value: 'other', label: 'Autre Méthode' },
];

interface ReportFormProps {
  reportToEdit?: FieldReport;
  isLoadingExternally?: boolean;
  onSubmitReport: (
    data: ReportSubmitPayload,
    status: 'DRAFT' | 'SUBMITTED',
    photoFile?: File | null 
  ) => Promise<{ success: boolean; reportId?: string; anomalyAssessment?: AnomalyAssessment }>;
}

export function ReportForm({ reportToEdit, isLoadingExternally, onSubmitReport }: ReportFormProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [submitActionType, setSubmitActionType] = useState<'DRAFT' | 'SUBMITTED' | null>(null);
  const [currentAnomalyResult, setCurrentAnomalyResult] = useState<AnomalyAssessment | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [assignedProjectsList, setAssignedProjectsList] = useState<Project[]>([]);
  const [isLoadingProjectsData, setIsLoadingProjectsData] = useState(true);

  // Test types dynamiques
  const [projectTestTypes, setProjectTestTypes] = useState<TestType[]>([]);
  const [testTypesLoaded, setTestTypesLoaded] = useState(false);
  const [selectedTestTypeId, setSelectedTestTypeId] = useState<string>('');
  const [testData, setTestData] = useState<Record<string, string>>({});
  const selectedTestType = projectTestTypes.find((t) => t.id === selectedTestTypeId) ?? null;
  const [compactionHeader, setCompactionHeader] = useState<Partial<CompactionReportData>>({});
  const [compactionRows, setCompactionRows] = useState<CompactionRowDraft[]>([]);

  const isEditMode = !!reportToEdit;

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: initialReportFormValues,
  });

  const isCompaction = form.watch('materialType') === 'compaction';

  useEffect(() => {
    const fetchProjectDataForForm = async () => {
      if (authLoading || !user) {
          setIsLoadingProjectsData(false);
          setAssignedProjectsList([]);
          form.setValue('projectId', ''); 
          return;
      }
      setIsLoadingProjectsData(true);
      try {
        const allFetchedProjects = await getProjects(user.organizationId ?? undefined);
        const userProfile = await getUserById(user.id);
        const currentUserAssignments = userProfile?.assignments || [];
        
        const userProjects = allFetchedProjects.filter(p => currentUserAssignments.some(a => a.projectId === p.id));
        setAssignedProjectsList(userProjects);
        
        if (!isEditMode && userProjects.length > 0 && !form.getValues('projectId')) {
            const firstId = userProjects[0].id;
            form.setValue('projectId', firstId);
            setTestTypesLoaded(false);
            getTestTypesForProject(firstId)
              .then(types => { setProjectTestTypes(types); setTestTypesLoaded(true); })
              .catch(() => setTestTypesLoaded(true));
        } else if (!isEditMode && userProjects.length === 0) {
             form.setValue('projectId', '');
        }

      } catch (error) {
        console.error("Échec de la récupération des projets pour le formulaire de rapport:", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les projets pour la sélection." });
        setAssignedProjectsList([]);
        if (!isEditMode) form.setValue('projectId', '');
      } finally {
        setIsLoadingProjectsData(false);
      }
    };
    fetchProjectDataForForm();
  }, [user, authLoading, form, toast, isEditMode]);


  useEffect(() => {
    if (isEditMode && reportToEdit) {
      form.reset({
        projectId: reportToEdit.projectId,
        materialType: reportToEdit.materialType as ReportFormData['materialType'],
        temperature: reportToEdit.temperature,
        volume: reportToEdit.volume,
        density: reportToEdit.density,
        humidity: reportToEdit.humidity,
        batchNumber: reportToEdit.batchNumber,
        supplier: reportToEdit.supplier,
        samplingMethod: reportToEdit.samplingMethod as ReportFormData['samplingMethod'],
        notes: reportToEdit.notes || '',
        photo: undefined,
        attachmentUrls: reportToEdit.attachments.join(', ') || '',
      });
      if (reportToEdit.photoDataUri) {
        setPhotoPreviewUrl(reportToEdit.photoDataUri);
      } else {
        setPhotoPreviewUrl(null);
      }
      // Restaurer le type de test et les données
      if (reportToEdit.testTypeId) {
        setSelectedTestTypeId(reportToEdit.testTypeId);
        if (reportToEdit.testData) {
          const restored: Record<string, string> = {};
          for (const [k, v] of Object.entries(reportToEdit.testData)) {
            restored[k] = v !== null && v !== undefined ? String(v) : '';
          }
          setTestData(restored);
        }
        setTestTypesLoaded(false);
        getTestTypesForProject(reportToEdit.projectId)
          .then(types => { setProjectTestTypes(types); setTestTypesLoaded(true); })
          .catch(() => setTestTypesLoaded(true));
      } else {
        setSelectedTestTypeId('');
        setTestData({});
      }
    } else if (!isEditMode) {
        form.reset(initialReportFormValues);
        setPhotoPreviewUrl(null);
        setSelectedTestTypeId('');
        setTestData({});
        if(photoInputRef.current) photoInputRef.current.value = '';
        if (assignedProjectsList.length > 0) {
            form.setValue('projectId', assignedProjectsList[0].id);
        } else {
            form.setValue('projectId', '');
        }
    }
  }, [reportToEdit, isEditMode, form, assignedProjectsList]);

  useEffect(() => {
    if (isCompaction) {
      form.setValue('temperature', 0);
      form.setValue('volume', 0);
      form.setValue('density', 0);
      form.setValue('humidity', 0);
      form.setValue('batchNumber', 'N/A');
      form.setValue('supplier', 'N/A');
      form.setValue('samplingMethod', 'other');
    }
  }, [isCompaction, form]);

  const handlePhotoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('photo', event.target.files ?? undefined, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else { 
      form.setValue('photo', undefined, { shouldValidate: true });
      setPhotoPreviewUrl(reportToEdit?.photoDataUri && !form.getValues('photo')?.[0] ? reportToEdit.photoDataUri : null);
    }
  };

  const removePhotoPreview = () => {
    setPhotoPreviewUrl(null);
    form.setValue('photo', undefined, { shouldValidate: true }); 
    if(photoInputRef.current) photoInputRef.current.value = ''; 
  };

  const handleSubmitClick = async (data: ReportFormData, status: 'DRAFT' | 'SUBMITTED') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur d\'Authentification', description: 'Vous devez être connecté.' });
      return;
    }
    // Validation des champs dynamiques du type de test
    if (selectedTestType) {
      const fieldErrors: string[] = [];
      for (const fieldDef of selectedTestType.fields) {
        const val = testData[fieldDef.key];
        if (fieldDef.required && (!val || val.trim() === '')) {
          fieldErrors.push(`"${fieldDef.label}" est requis`);
        } else if (fieldDef.type === 'number' && val && val.trim() !== '') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            if (fieldDef.min !== undefined && num < fieldDef.min)
              fieldErrors.push(`"${fieldDef.label}" doit être ≥ ${fieldDef.min}${fieldDef.unit ? ' ' + fieldDef.unit : ''}`);
            if (fieldDef.max !== undefined && num > fieldDef.max)
              fieldErrors.push(`"${fieldDef.label}" doit être ≤ ${fieldDef.max}${fieldDef.unit ? ' ' + fieldDef.unit : ''}`);
          }
        }
      }
      if (fieldErrors.length > 0) {
        toast({ variant: 'destructive', title: 'Champs de test invalides', description: fieldErrors.join('\n'), duration: 8000 });
        return;
      }
    }

    setIsSubmittingForm(true);
    setSubmitActionType(status);
    setCurrentAnomalyResult(null);

    const reportPayload: ReportSubmitPayload = {
      projectId: data.projectId,
      materialType: data.materialType,
      temperature: data.temperature,
      volume: data.volume,
      density: data.density,
      humidity: data.humidity,
      batchNumber: data.batchNumber,
      supplier: data.supplier,
      samplingMethod: data.samplingMethod,
      notes: data.notes || '',
      status: status,
      attachments: data.attachmentUrls ? data.attachmentUrls.split(',').map(url => url.trim()).filter(url => url) : [],
      testTypeId: selectedTestTypeId || null,
      testData: selectedTestTypeId && Object.keys(testData).length > 0 ? testData : null,
    };
    
    let photoFileArg: File | null | undefined = undefined;
    if (data.photo && data.photo.length > 0) {
        photoFileArg = data.photo[0]; 
    } else if (isEditMode && reportToEdit?.photoDataUri && !photoPreviewUrl) {
        photoFileArg = null; 
    }

    // Compaction reports don't use generic material fields — use neutral defaults
    if (isCompaction) {
      reportPayload.temperature = 0;
      reportPayload.volume = 0;
      reportPayload.density = 0;
      reportPayload.humidity = 0;
      reportPayload.batchNumber = 'N/A';
      reportPayload.supplier = 'N/A';
      reportPayload.samplingMethod = 'other';
      reportPayload.testData = compactionHeader;
    }

    toast({ title: 'Traitement du Rapport...', description: 'Vérification des anomalies par l\'IA en cours...' });

    const { success, reportId, anomalyAssessment } = await onSubmitReport(reportPayload, status, photoFileArg);
    setCurrentAnomalyResult(anomalyAssessment || null);

    // Save compaction test rows after report creation
    if (success && reportId && isCompaction && compactionRows.length > 0) {
      try {
        await fetch('/api/compaction-rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId, rows: compactionRows }),
        });
      } catch {
        // Non-blocking: rows save failure doesn't fail the report creation
        console.error('Failed to save compaction rows');
      }
    }

    if (success) {
      const actionVerb = isEditMode ? "mis à jour" : "créé";
      const anomalyMessage = anomalyAssessment?.isAnomalous ? `Rapport ${actionVerb} et analyse IA terminée.` : `Rapport ${actionVerb}. Aucune anomalie détectée.`;
      
      toast({
        variant: anomalyAssessment?.isAnomalous && status === 'SUBMITTED' ? 'default' : (anomalyAssessment?.isAnomalous ? 'destructive' : 'default'),
        title: isEditMode ? 'Rapport Mis à Jour' : 'Rapport Créé',
        description: `${reportId ? `ID: ${reportId}. ` : ''}${anomalyMessage} ${status === 'DRAFT' && anomalyAssessment?.isAnomalous ? 'Anomalie détectée dans le brouillon.' : ''}`,
        duration: 7000,
      });

      if (!isEditMode || status === 'DRAFT') {
        form.reset(initialReportFormValues);
        setPhotoPreviewUrl(null);
        if(photoInputRef.current) photoInputRef.current.value = '';
        if (assignedProjectsList.length > 0) {
            form.setValue('projectId', assignedProjectsList[0].id);
        } else {
            form.setValue('projectId', '');
        }
      }
    } else {
      toast({ 
        variant: 'destructive', 
        title: status === 'SUBMITTED' && anomalyAssessment?.isAnomalous ? 'Soumission Empêchée par l\'IA' : 'Erreur', 
        description: anomalyAssessment?.isAnomalous 
          ? anomalyAssessment.explanation 
          : `Échec de ${isEditMode ? 'la mise à jour' : 'la création'} du rapport.`,
        duration: 10000 
      });
    }

    setIsSubmittingForm(false);
    setSubmitActionType(null);
  };

  const pageLoading = authLoading || isLoadingProjectsData || (isEditMode && isLoadingExternally);

  if (pageLoading) {
      return (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{isEditMode ? "Modifier le Rapport de Terrain" : "Soumettre un Rapport de Terrain"}</CardTitle>
            <CardDescription>Chargement des données du formulaire...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
             <Skeleton className="h-20 w-full" />
             <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
             </div>
          </CardContent>
        </Card>
      );
  }
  

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle>{isEditMode ? "Modifier le Rapport de Terrain" : "Soumettre un Rapport de Terrain"}</CardTitle>
        <CardDescription>
          {isEditMode ? `Modification du rapport ID: ${reportToEdit?.id}. ` : ""}
          Entrez les détails du rapport de test des matériaux. Tous les champs sont requis sauf indication contraire.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet (auquel vous êtes assigné)</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedTestTypeId('');
                        setTestData({});
                        setTestTypesLoaded(false);
                        getTestTypesForProject(val)
                          .then(types => { setProjectTestTypes(types); setTestTypesLoaded(true); })
                          .catch(() => setTestTypesLoaded(true));
                      }}
                      value={field.value || ""}
                      disabled={assignedProjectsList.length === 0 || !user || isSubmittingForm}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={assignedProjectsList.length === 0 ? "Aucun projet assigné ou chargeable" : "Sélectionner un projet assigné"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedProjectsList.length === 0 && <SelectItem value="-" disabled>{user ? "Aucun projet ne vous est assigné" : "Connectez-vous pour voir les projets"}</SelectItem>}
                        {assignedProjectsList.map(project => (
                          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Feedback : aucun type de test sur ce projet ── */}
              {form.watch('projectId') && testTypesLoaded && projectTestTypes.length === 0 && (
                <FormItem>
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" />
                    Aucun type de test assigné à ce projet. Un administrateur peut en assigner via <strong className="mx-0.5">Panneau Admin → Types de Tests</strong>.
                  </p>
                </FormItem>
              )}

              {/* ── Sélecteur de type de test ── */}
              {projectTestTypes.length > 0 && (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4 text-blue-500" />
                    Type de test (optionnel)
                  </FormLabel>
                  <Select
                    value={selectedTestTypeId}
                    onValueChange={(val) => {
                      setSelectedTestTypeId(val === 'none' ? '' : val);
                      setTestData({});
                    }}
                    disabled={isSubmittingForm}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type de test effectué" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun type spécifique —</SelectItem>
                      {projectTestTypes.map((tt) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          <span className="flex items-center gap-2">
                            {tt.name}
                            <span className="text-xs text-muted-foreground">({CATEGORY_LABELS[tt.category] ?? tt.category})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associe ce rapport à un template de test normalisé pour une meilleure traçabilité.
                  </FormDescription>
                </FormItem>
              )}
              <FormField
                control={form.control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de rapport</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type de rapport" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {materialTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sélectionnez &laquo;&nbsp;Contrôle de compacité&nbsp;&raquo; pour générer un rapport RC-6306.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de Lot</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LOT-XYZ-123" {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Matériaux Acme Ltée." {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Température (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="Ex: 25.5" {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="volume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Volume (m³)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 10.25" {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="density"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Densité (kg/m³)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="Ex: 1500.0" {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="humidity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Humidité (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="Ex: 60.5" {...field} disabled={isSubmittingForm} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!isCompaction && (
                <FormField
                  control={form.control}
                  name="samplingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Méthode d'Échantillonnage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner la méthode d'échantillonnage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {samplingMethodOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Télécharger une Photo (Optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoInputChange}
                        name={field.name} 
                        ref={photoInputRef}
                        disabled={isSubmittingForm}
                        className="pt-2"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <Camera className="mr-2 h-4 w-4" /> Max {MAX_FILE_SIZE_MB}Mo. JPG, PNG, WEBP.
                    </FormDescription>
                    <FormMessage />
                    {photoPreviewUrl && (
                      <div className="mt-2 relative w-fit">
                        <Image src={photoPreviewUrl} alt="Aperçu de la photo" width={200} height={200} className="rounded-md object-cover max-h-48 w-auto" data-ai-hint="material sample" />
                         <Button variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={removePhotoPreview} type="button" disabled={isSubmittingForm} title="Retirer la photo">
                            <X className="h-3 w-3"/>
                         </Button>
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes (Optionnel)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Toute observation ou commentaire supplémentaire..." {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachmentUrls"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Autres URLs de Pièces Jointes (Optionnel, ex: PDF)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: https://example.com/doc.pdf" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <Paperclip className="mr-2 h-4 w-4" /> URLs séparées par des virgules pour tout document joint, spécifications, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ── Compaction UI ── */}
            {isCompaction && (
              <div className="space-y-3">
                <div className="rounded-md border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                  <strong>Rapport RC-6306 — Contrôle de compacité</strong>
                  <span className="mx-1.5">·</span>
                  Remplissez les informations du chantier, les matériaux de référence, puis ajoutez les essais réalisés. Le rapport RC-6304 (synthèse client) sera généré automatiquement depuis la page du projet.
                </div>
                <CompactionHeaderForm
                  value={compactionHeader}
                  onChange={setCompactionHeader}
                />
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm">Essais de compacité</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <CompactionTestTable
                      rows={compactionRows}
                      onRowsChange={setCompactionRows}
                      material1Name={compactionHeader.material1?.name || 'Mat. 1'}
                      material2Name={compactionHeader.material2?.name || 'Mat. 2'}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Champs dynamiques du type de test ── */}
            {selectedTestType && (
              <Card className="border-blue-200 bg-blue-50/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold text-blue-800">
                      {selectedTestType.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[selectedTestType.category] ?? selectedTestType.category}
                    </Badge>
                  </div>
                  {selectedTestType.description && (
                    <CardDescription className="text-xs mt-0.5">{selectedTestType.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTestType.fields.map((fieldDef: TestFieldDef) => (
                      <DynamicField
                        key={fieldDef.key}
                        fieldDef={fieldDef}
                        value={testData[fieldDef.key] ?? ''}
                        onChange={(val) => setTestData((prev) => ({ ...prev, [fieldDef.key]: val }))}
                        disabled={isSubmittingForm}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                    type="button"
                    onClick={form.handleSubmit(data => handleSubmitClick(data, 'DRAFT'))} 
                    variant="outline" 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmittingForm || !user || (assignedProjectsList.length === 0 && !isEditMode) || pageLoading}
                >
                {isSubmittingForm && submitActionType === 'DRAFT' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sauvegarde...</>
                ) : (
                    <><Save className="mr-2 h-4 w-4" /> {isEditMode ? "Enregistrer les Modifications du Brouillon" : "Enregistrer comme Brouillon"}</>
                )}
                </Button>
                <Button 
                    type="button" 
                    onClick={form.handleSubmit(data => handleSubmitClick(data, 'SUBMITTED'))} 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmittingForm || !user || (assignedProjectsList.length === 0 && !isEditMode) || pageLoading}
                >
                {isSubmittingForm && submitActionType === 'SUBMITTED' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Soumission...</>
                ) : (
                    <><Send className="mr-2 h-4 w-4" /> {isEditMode ? "Soumettre le Rapport Modifié" : "Soumettre pour Validation"}</>
                )}
                </Button>
            </div>
          </form>
        </Form>

        {currentAnomalyResult && (
          <Alert variant={currentAnomalyResult.isAnomalous ? "destructive" : "default"} className="mt-6">
             {currentAnomalyResult.isAnomalous ? <AlertTriangleIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-green-500" />}
            <AlertTitle className={currentAnomalyResult.isAnomalous ? "" : "text-green-700 dark:text-green-400"}>
              {currentAnomalyResult.isAnomalous ? 'Résultat Détection Anomalie IA : Anomalie Potentielle Trouvée' : 'Résultat Détection Anomalie IA : Aucune Anomalie Détectée'}
            </AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {currentAnomalyResult.explanation}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Composant champ dynamique ────────────────────────────────────────────────

function DynamicField({
  fieldDef,
  value,
  onChange,
  disabled,
}: {
  fieldDef: TestFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const id = `dynamic-${fieldDef.key}`;
  const isTextArea = fieldDef.type === 'text';
  return (
    <div className={`space-y-1.5 ${isTextArea ? 'md:col-span-2' : ''}`}>
      <Label htmlFor={id} className="text-sm">
        {fieldDef.label}
        {fieldDef.unit && <span className="text-muted-foreground ml-1 text-xs">({fieldDef.unit})</span>}
        {fieldDef.required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>

      {fieldDef.type === 'number' && (
        <Input
          id={id}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            fieldDef.min !== undefined && fieldDef.max !== undefined
              ? `${fieldDef.min} – ${fieldDef.max}`
              : undefined
          }
          className="h-9"
        />
      )}

      {fieldDef.type === 'text' && (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={2}
          className="text-sm"
        />
      )}

      {(fieldDef.type === 'select' || fieldDef.type === 'boolean') && (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sélectionner…" />
          </SelectTrigger>
          <SelectContent>
            {fieldDef.type === 'boolean' ? (
              <>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </>
            ) : (
              (fieldDef.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {fieldDef.hint && (
        <p className="text-xs text-muted-foreground">{fieldDef.hint}</p>
      )}
    </div>
  );
}
