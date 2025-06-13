
'use client';

import React, { useState } from 'react';
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
import { Loader2, Sparkles, AlertTriangleIcon } from 'lucide-react';

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
  attachments: z.string().optional().describe('Comma-separated URLs for attachments'),
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

export function ReportForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState<AnomalyAssessment | null>(null);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      notes: '',
      attachments: '',
    },
  });

  const onSubmit = async (data: ReportFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to submit a report.' });
      return;
    }
    setIsSubmitting(true);
    setAnomalyResult(null);

    const fieldReportData: FieldReport = {
      ...data,
      id: crypto.randomUUID(),
      technicianId: user.uid,
      status: 'SUBMITTED',
      attachments: data.attachments ? data.attachments.split(',').map(url => url.trim()).filter(url => url) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      toast({ title: 'Analyzing Report...', description: 'Please wait while AI checks for anomalies.' });
      const assessment = await detectReportAnomaly(fieldReportData);
      setAnomalyResult(assessment);

      if (assessment.isAnomalous) {
        toast({
          variant: 'destructive',
          title: 'Anomaly Detected!',
          description: 'Review the details below and consider revising the report.',
          duration: 10000,
        });
      } else {
        toast({
          title: 'Report Submitted & Analyzed',
          description: 'No anomalies detected by AI. Report submitted successfully.',
          duration: 7000,
        });
      }
      // Here you would typically save the fieldReportData and assessment to your database
      console.log('Field Report Data:', fieldReportData);
      console.log('Anomaly Assessment:', assessment);
      // form.reset(); // Optionally reset form
    } catch (error) {
      console.error('Error submitting report or detecting anomaly:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: 'Could not submit report or run anomaly detection.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle>Submit Field Report</CardTitle>
        <CardDescription>Enter the details for the material test report. All fields are required unless marked optional.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PJT-001" {...field} />
                    </FormControl>
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
                  <FormItem className="md:col-span-2">
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
                name="attachments"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Attachments (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://example.com/photo1.jpg, https://example.com/doc.pdf" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated URLs for any attached files (e.g., photos, documents).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full md:w-auto rounded-lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting & Analyzing...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Submit & Check Anomaly</>
              )}
            </Button>
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
