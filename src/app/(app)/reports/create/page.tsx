
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReportForm, type ReportSubmitPayload } from './components/ReportForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addReport } from '@/services/reportService';
import { detectReportAnomaly, type FieldReport, type AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import { useRouter } from 'next/navigation';


const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function CreateReportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateReportSubmit = async (
    data: ReportSubmitPayload,
    status: 'DRAFT' | 'SUBMITTED',
    photoFile?: File | null | undefined
  ): Promise<{ success: boolean; reportId?: string; anomalyAssessment?: AnomalyAssessment }> => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a report.' });
      return { success: false };
    }

    let photoDataUriInSubmit: string | undefined = undefined;
    if (photoFile) {
      try {
        photoDataUriInSubmit = await readFileAsDataURL(photoFile);
      } catch (error) {
        console.error("Error reading photo file for new report:", error);
        toast({ variant: 'destructive', title: 'Photo Error', description: 'Could not process the photo.' });
        return { success: false };
      }
    }
    
    const reportDataToSave: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      technicianId: user.uid,
      photoDataUri: photoDataUriInSubmit, // Can be undefined
      status: status, // status is already in 'data' from ReportSubmitPayload, but re-affirm
    };

    try {
      const newReportId = await addReport(reportDataToSave);
      
      // For AI analysis, create a temporary full FieldReport object
      const fullReportForAI: FieldReport = {
          ...reportDataToSave,
          id: newReportId, // Use the new ID
          createdAt: new Date().toISOString(), // Approximate for AI
          updatedAt: new Date().toISOString(), // Approximate for AI
      };
      const assessment = await detectReportAnomaly(fullReportForAI);
      
      return { success: true, reportId: newReportId, anomalyAssessment: assessment };

    } catch (error) {
      console.error('Error creating report:', error);
      return { success: false };
    }
  };


  return (
    <>
      <PageTitle 
        title="Create New Field Report" 
        icon={FileText}
        subtitle="Fill in the details below to submit a new field report and get AI-powered anomaly detection."
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
               <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Back to Reports
            </Link>
          </Button>
        }
      />
      <ReportForm onSubmitReport={handleCreateReportSubmit} />
    </>
  );
}
