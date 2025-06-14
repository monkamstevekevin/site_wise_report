
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Not strictly needed if using FormLabel
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { AnomalyAssessment, FieldReport } from '@/ai/flows/report-anomaly-detection';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangleIcon, Camera, Paperclip, Save, Send } from 'lucide-react';
import Image from 'next/image';
import { getProjects } from '@/services/projectService';
import type { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserById } from '@/services/userService';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const reportFormSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  materialType: z.enum(['cement', 'asphalt', 'gravel', 'sand', 'other'], {
    required_error: 'Material type is required.',
  }),
  temperature: z.coerce.number().min(-50, "Too low").max(200, "Too high"),
  volume: z.coerce.number().positive('Volume must be positive'),
  density: z.coerce.number().positive('Density must be positive'),
  humidity: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%"),
  batchNumber: z.string().min(1, 'Batch number is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  samplingMethod: z.enum(['grab', 'composite', 'core', 'other'], {
    required_error: 'Sampling method is required.',
  }),
  notes: z.string().optional(),
  photo: z
    .custom<FileList>()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES,
      `Max image size is ${MAX_FILE_SIZE_MB}MB.`
    )
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
  attachmentUrls: z.string().optional().describe('Comma-separated URLs for other attachments like documents'),
});

export type ReportFormData = z.infer<typeof reportFormSchema>;

export type ReportSubmitPayload = Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'photoDataUri'> & {
  // photoDataUri is derived from photoFile by the parent
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

  const isEditMode = !!reportToEdit;

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: initialReportFormValues,
  });

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
        const allFetchedProjects = await getProjects();
        const userProfile = await getUserById(user.uid); // Fetch current user's profile
        const currentUserAssignedIds = userProfile?.assignedProjectIds || [];
        
        const userProjects = allFetchedProjects.filter(p => currentUserAssignedIds.includes(p.id));
        setAssignedProjectsList(userProjects);
        
        if (!isEditMode && userProjects.length > 0 && !form.getValues('projectId')) {
            form.setValue('projectId', userProjects[0].id); 
        } else if (!isEditMode && userProjects.length === 0) {
             form.setValue('projectId', '');
        }

      } catch (error) {
        console.error("Failed to fetch projects for report form:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load projects for selection." });
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
    } else if (!isEditMode) {
        form.reset(initialReportFormValues); // Ensure reset for create mode
        setPhotoPreviewUrl(null);
        if(photoInputRef.current) photoInputRef.current.value = '';
        // Default project setting is now handled in fetchProjectDataForForm
    }
  }, [reportToEdit, isEditMode, form]);

  const handlePhotoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('photo', event.target.files, { shouldValidate: true }); 
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
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmittingForm(true);
    setSubmitActionType(status);
    setCurrentAnomalyResult(null); // Clear previous anomaly result

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
    };
    
    let photoFileArg: File | null | undefined = undefined;
    if (data.photo && data.photo.length > 0) {
        photoFileArg = data.photo[0]; 
    } else if (isEditMode && reportToEdit?.photoDataUri && !photoPreviewUrl) {
        photoFileArg = null; 
    }

    toast({ title: 'Processing Report...', description: 'AI checking for anomalies...' });
    
    const { success, reportId, anomalyAssessment } = await onSubmitReport(reportPayload, status, photoFileArg);
    setCurrentAnomalyResult(anomalyAssessment || null);

    if (success) {
      const actionVerb = isEditMode ? "updated" : "created";
      const anomalyMessage = anomalyAssessment?.isAnomalous ? `Report ${actionVerb} and AI analysis complete.` : `Report ${actionVerb}. No anomalies detected.`;
      
      toast({
        variant: anomalyAssessment?.isAnomalous && status === 'SUBMITTED' ? 'default' : (anomalyAssessment?.isAnomalous ? 'destructive' : 'default'), // default for info on draft, destructive for anomaly on submit attempt
        title: isEditMode ? 'Report Updated' : 'Report Created',
        description: `${reportId ? `ID: ${reportId}. ` : ''}${anomalyMessage} ${status === 'DRAFT' && anomalyAssessment?.isAnomalous ? 'Anomaly detected in draft.' : ''}`,
        duration: 7000,
      });

      // Reset form only in create mode OR if it was a DRAFT submission (even in edit mode)
      if (!isEditMode || status === 'DRAFT') {
        form.reset(initialReportFormValues);
        setPhotoPreviewUrl(null);
        if(photoInputRef.current) photoInputRef.current.value = '';
        // Re-set default project if available
        if (assignedProjectsList.length > 0) {
            form.setValue('projectId', assignedProjectsList[0].id);
        } else {
            form.setValue('projectId', '');
        }
        form.setValue('materialType', undefined as unknown as ReportFormData['materialType']);
        form.setValue('samplingMethod', undefined as unknown as ReportFormData['samplingMethod']);
      }
      // Navigation for successful "SUBMITTED" in edit mode is handled by the parent EditReportPage
    } else {
      // This case is now specifically for when success is false,
      // which primarily happens if AI blocks a "SUBMITTED" action.
      toast({ 
        variant: 'destructive', 
        title: status === 'SUBMITTED' && anomalyAssessment?.isAnomalous ? 'Submission Prevented by AI' : 'Error', 
        description: anomalyAssessment?.isAnomalous 
          ? anomalyAssessment.explanation 
          : `Failed to ${isEditMode ? 'update' : 'create'} report.`,
        duration: 10000 // Longer duration for errors user needs to read
      });
      // DO NOT RESET THE FORM, so user can make corrections
    }

    setIsSubmittingForm(false);
    setSubmitActionType(null);
  };

  const pageLoading = authLoading || isLoadingProjectsData || (isEditMode && isLoadingExternally);

  if (pageLoading) {
      return (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Field Report" : "Submit Field Report"}</CardTitle>
            <CardDescription>Loading form data...</CardDescription>
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
        <CardTitle>{isEditMode ? "Edit Field Report" : "Submit Field Report"}</CardTitle>
        <CardDescription>
          {isEditMode ? `Editing report ID: ${reportToEdit?.id}. ` : ""}
          Enter the details for the material test report. All fields are required unless marked optional.
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
                    <FormLabel>Project (Assigned to you)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""} 
                      disabled={assignedProjectsList.length === 0 || !user || isSubmittingForm}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={assignedProjectsList.length === 0 ? "No projects assigned or loadable" : "Select an assigned project"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedProjectsList.length === 0 && <SelectItem value="-" disabled>{user ? "No projects assigned to you" : "Login to see projects"}</SelectItem>}
                        {assignedProjectsList.map(project => (
                          <SelectItem key={project.id} value={project.id}>{project.name} ({project.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., BATCH-XYZ-123" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="materialType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
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
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Acme Materials Co." {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°C)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g., 25.5" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="volume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g., 10.25" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="density"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Density (kg/m³)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g., 1500.0" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="humidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Humidity (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="e.g., 60.5" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="samplingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sampling Method</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingForm}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sampling method" />
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

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Upload Photo (Optional)</FormLabel>
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
                      <Camera className="mr-2 h-4 w-4" /> Max {MAX_FILE_SIZE_MB}MB. JPG, PNG, WEBP.
                    </FormDescription>
                    <FormMessage />
                    {photoPreviewUrl && (
                      <div className="mt-2 relative w-fit">
                        <Image src={photoPreviewUrl} alt="Photo preview" width={200} height={200} className="rounded-md object-cover max-h-48 w-auto" data-ai-hint="material sample" />
                         <Button variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full" onClick={removePhotoPreview} type="button" disabled={isSubmittingForm} title="Remove photo">
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional observations or comments..." {...field} disabled={isSubmittingForm} />
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
                    <FormLabel>Other Attachment URLs (Optional, e.g., PDFs)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://example.com/doc.pdf" {...field} disabled={isSubmittingForm} />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <Paperclip className="mr-2 h-4 w-4" /> Comma-separated URLs for any attached documents, specs, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                    type="button" 
                    onClick={form.handleSubmit(data => handleSubmitClick(data, 'DRAFT'))} 
                    variant="outline" 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmittingForm || !user || assignedProjectsList.length === 0 || pageLoading}
                >
                {isSubmittingForm && submitActionType === 'DRAFT' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                    <><Save className="mr-2 h-4 w-4" /> {isEditMode ? "Save Draft Changes" : "Save as Draft"}</>
                )}
                </Button>
                <Button 
                    type="button" 
                    onClick={form.handleSubmit(data => handleSubmitClick(data, 'SUBMITTED'))} 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmittingForm || !user || assignedProjectsList.length === 0 || pageLoading}
                >
                {isSubmittingForm && submitActionType === 'SUBMITTED' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                    <><Send className="mr-2 h-4 w-4" /> {isEditMode ? "Submit Updated Report" : "Submit for Validation"}</>
                )}
                </Button>
            </div>
          </form>
        </Form>

        {currentAnomalyResult && (
          <Alert variant={currentAnomalyResult.isAnomalous ? "destructive" : "default"} className="mt-6">
             {currentAnomalyResult.isAnomalous ? <AlertTriangleIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-green-500" />}
            <AlertTitle className={currentAnomalyResult.isAnomalous ? "" : "text-green-700 dark:text-green-400"}>
              {currentAnomalyResult.isAnomalous ? 'AI Anomaly Detection Result: Potential Anomaly Found' : 'AI Anomaly Detection Result: No Anomaly Detected'}
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
