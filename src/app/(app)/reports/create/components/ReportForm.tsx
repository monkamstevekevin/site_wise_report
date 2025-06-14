
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { detectReportAnomaly, type FieldReport, type AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, AlertTriangleIcon, Camera, Paperclip, Save, Send } from 'lucide-react';
import Image from 'next/image';
import { getProjects } from '@/services/projectService'; // Import project service
import type { Project } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants'; // Assuming technician ID is used for assigned projects logic
import { addReport as saveReportToFirestore } from '@/services/reportService'; // Import the addReport function

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

type ReportFormData = z.infer<typeof reportFormSchema>;

const materialTypeOptions: { value: ReportFormData['materialType']; label: string }[] = [
  { value: 'cement', label: 'Cement' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'other', label: 'Other' },
];

const samplingMethodOptions: { value: ReportFormData['samplingMethod']; label: string }[] = [
  { value: 'grab', label: 'Grab Sample' },
  { value: 'composite', label: 'Composite Sample' },
  { value: 'core', label: 'Core Sample' },
  { value: 'other', label: 'Other Method' },
];

const MOCK_USER_ASSIGNED_PROJECT_IDS_TEMP = ['PJT001', 'PJT003', MOCK_TECHNICIAN_REPORTS_ID]; 

export function ReportForm() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<'DRAFT' | 'SUBMITTED' | null>(null);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyAssessment | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      notes: '',
      attachmentUrls: '',
      projectId: '', 
    },
  });

  useEffect(() => {
    const fetchAllProjects = async () => {
      if (authLoading) return; 
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await getProjects();
        setAllProjects(fetchedProjects);

        if (user) {
          const userProfile = initialMockUsersData.find(u => u.id === user.uid || (user.email === 'tech@example.com' && u.id === MOCK_TECHNICIAN_REPORTS_ID));
          const currentUserAssignedIds = userProfile?.assignedProjectIds || [];
          
          const userProjects = fetchedProjects.filter(p => currentUserAssignedIds.includes(p.id));
          setAssignedProjects(userProjects);
          
          if (userProjects.length > 0 && !form.getValues('projectId')) {
            form.setValue('projectId', userProjects[0].id); 
          }
        } else {
          setAssignedProjects([]); 
        }

      } catch (error) {
        console.error("Failed to fetch projects for report form:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load projects." });
        setAssignedProjects([]); 
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchAllProjects();
  }, [user, authLoading, form, toast]);
  
   const initialMockUsersData: User[] = [
    {
      id: MOCK_TECHNICIAN_REPORTS_ID, 
      name: 'Test Technician',
      email: 'tech@example.com',
      role: 'TECHNICIAN',
      assignedProjectIds: ['PJT001', 'PJT002', 'PJT003', 'PJT005'], 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
     {
      id: 'janesteve237', // Example UID for janesteve237@gmail.com
      name: 'Jane Steve (Admin)',
      email: 'janesteve237@gmail.com',
      role: 'ADMIN',
      assignedProjectIds: ['PJT001', 'PJT002', 'PJT003', 'PJT004', 'PJT005'], // Admins might see all or many
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];


  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const processSubmit = async (data: ReportFormData, status: 'DRAFT' | 'SUBMITTED') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitAction(status);
    setAnomalyResult(null);

    let photoDataUri: string | undefined = undefined;
    if (data.photo && data.photo.length > 0) {
      try {
        photoDataUri = await readFileAsDataURL(data.photo[0]);
      } catch (error) {
        console.error("Error reading photo file:", error);
        toast({ variant: 'destructive', title: 'Photo Error', description: 'Could not process the photo.' });
        setIsSubmitting(false);
        setSubmitAction(null);
        return;
      }
    }

    // Prepare data for Firestore (excluding id, createdAt, updatedAt which are set by service/server)
    // and also excluding the 'photo' FileList object.
    const reportDataToSave: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: data.projectId,
      technicianId: user.uid, 
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
      photoDataUri: photoDataUri,
    };

    try {
      // This is the FieldReport structure expected by detectReportAnomaly, including a temporary ID and timestamps
      const fullReportDataForAI: FieldReport = {
        ...reportDataToSave,
        id: 'temp-for-ai-' + crypto.randomUUID(), // Temporary ID for AI check
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      toast({ title: 'Analyzing Report...', description: 'AI checking for anomalies...' });
      const assessment = await detectReportAnomaly(fullReportDataForAI);
      setAnomalyResult(assessment);

      // Now, save to Firestore
      const newReportId = await saveReportToFirestore(reportDataToSave);

      if (status === 'SUBMITTED') {
        if (assessment.isAnomalous) {
          toast({
            variant: 'destructive',
            title: 'Anomaly Detected!',
            description: `Report ${newReportId} submitted but flagged. Review details.`,
            duration: 10000,
          });
        } else {
          toast({
            title: 'Report Submitted & Analyzed',
            description: `Report ${newReportId} submitted. No anomalies detected.`,
            duration: 7000,
          });
        }
      } else { 
         toast({
            title: 'Report Saved as Draft',
            description: `Report ${newReportId} saved. ${assessment.isAnomalous ? 'Anomaly detected in draft.' : 'No anomalies detected by AI.'}`,
            duration: 7000,
          });
      }
      
      form.reset(); 
      setPhotoPreview(null);
      if(photoInputRef.current) photoInputRef.current.value = '';
      setAnomalyResult(null); // Clear previous anomaly result

    } catch (error) {
      console.error('Error processing report:', error);
      toast({ variant: 'destructive', title: 'Error Processing Report', description: (error as Error).message || 'Could not process report.' });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  };

  if (authLoading || isLoadingProjects) {
      return (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Submit Field Report</CardTitle>
            <CardDescription>Enter the details for the material test report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
        <CardTitle>Submit Field Report</CardTitle>
        <CardDescription>Enter the details for the material test report. All fields are required unless marked optional.</CardDescription>
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
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger disabled={assignedProjects.length === 0 && !user}>
                          <SelectValue placeholder={assignedProjects.length === 0 ? "No projects assigned or loadable" : "Select an assigned project"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignedProjects.length === 0 && <SelectItem value="-" disabled>{user ? "No projects assigned to you" : "Login to see projects"}</SelectItem>}
                        {assignedProjects.map(project => (
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
                      <Input placeholder="e.g., BATCH-XYZ-123" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input placeholder="e.g., Acme Materials Co." {...field} />
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
                      <Input type="number" step="0.1" placeholder="e.g., 25.5" {...field} />
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
                      <Input type="number" step="0.01" placeholder="e.g., 10.25" {...field} />
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
                      <Input type="number" step="0.1" placeholder="e.g., 1500.0" {...field} />
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
                      <Input type="number" step="0.1" placeholder="e.g., 60.5" {...field} />
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
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Upload Photo (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          onChange(e.target.files);
                          handlePhotoChange(e);
                        }}
                        {...rest}
                        ref={photoInputRef}
                        className="pt-2"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <Camera className="mr-2 h-4 w-4" /> Max {MAX_FILE_SIZE_MB}MB. JPG, PNG, WEBP.
                    </FormDescription>
                    <FormMessage />
                    {photoPreview && (
                      <div className="mt-2">
                        <Image src={photoPreview} alt="Photo preview" width={200} height={200} className="rounded-md object-cover max-h-48 w-auto" data-ai-hint="material sample" />
                         <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" onClick={() => {
                            setPhotoPreview(null);
                            form.setValue('photo', undefined);
                            if(photoInputRef.current) photoInputRef.current.value = '';
                         }}>Remove photo</Button>
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
                      <Textarea placeholder="Any additional observations or comments..." {...field} />
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
                      <Input placeholder="e.g., https://example.com/doc.pdf" {...field} />
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
                    onClick={form.handleSubmit(data => processSubmit(data, 'DRAFT'))} 
                    variant="outline" 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmitting || !user}
                >
                {isSubmitting && submitAction === 'DRAFT' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save as Draft</>
                )}
                </Button>
                <Button 
                    type="button" 
                    onClick={form.handleSubmit(data => processSubmit(data, 'SUBMITTED'))} 
                    className="w-full sm:w-auto rounded-lg" 
                    disabled={isSubmitting || !user}
                >
                {isSubmitting && submitAction === 'SUBMITTED' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                ) : (
                    <><Send className="mr-2 h-4 w-4" /> Submit for Validation</>
                )}
                </Button>
            </div>
          </form>
        </Form>

        {anomalyResult && (
          <Alert variant={anomalyResult.isAnomalous ? "destructive" : "default"} className="mt-6">
             {anomalyResult.isAnomalous ? <AlertTriangleIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-green-500" />}
            <AlertTitle className={anomalyResult.isAnomalous ? "" : "text-green-700 dark:text-green-400"}>
              {anomalyResult.isAnomalous ? 'AI Anomaly Detection Result: Potential Anomaly Found' : 'AI Anomaly Detection Result: No Anomaly Detected'}
            </AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {anomalyResult.explanation}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';
  avatarUrl?: string;
  assignedProjectIds: string[];
  createdAt: string;
  updatedAt: string;
}
