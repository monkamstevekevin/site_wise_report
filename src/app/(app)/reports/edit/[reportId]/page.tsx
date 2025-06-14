
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTitle } from '@/components/common/PageTitle';
import { FileText, ArrowLeft, Loader2, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReportForm, type ReportSubmitPayload } from '@/app/(app)/reports/create/components/ReportForm'; // Reusing the form
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getReportById, updateReport } from '@/services/reportService';
import { detectReportAnomaly, type FieldReport, type AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';


const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


export default function EditReportPage() {
  const params = useParams();
  const router = useRouter();
  const { reportId } = params as { reportId: string };
  
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [reportToEdit, setReportToEdit] = useState<FieldReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [errorLoadingReport, setErrorLoadingReport] = useState<string | null>(null);

  useEffect(() => {
    if (reportId && user) { 
      setIsLoadingReport(true);
      setErrorLoadingReport(null);
      getReportById(reportId)
        .then(data => {
          if (data) {
            const isOwner = data.technicianId === user.uid;
            const isAdminOrSupervisor = user.email?.includes('admin@') || user.email?.includes('supervisor@'); 
            
            if (isOwner || isAdminOrSupervisor || data.status === 'DRAFT') { 
                 setReportToEdit(data);
            } else {
                setErrorLoadingReport("You do not have permission to edit this report, or it's not in a state that allows editing by you.");
                toast({variant: "destructive", title: "Permission Denied", description: "Cannot edit this report."});
            }
          } else {
            setErrorLoadingReport(`Report with ID ${reportId} not found.`);
          }
        })
        .catch(err => {
          console.error("Error fetching report for editing:", err);
          setErrorLoadingReport("Failed to load report data for editing.");
        })
        .finally(() => setIsLoadingReport(false));
    } else if (!user && !authLoading) {
        setIsLoadingReport(false);
        setErrorLoadingReport("You must be logged in to edit reports.");
    }

  }, [reportId, user, authLoading, toast]);

  const handleUpdateReportSubmit = async (
    data: ReportSubmitPayload,
    status: 'DRAFT' | 'SUBMITTED',
    photoFile?: File | null | undefined
  ): Promise<{ success: boolean; reportId?: string; anomalyAssessment?: AnomalyAssessment }> => {
    if (!user || !reportToEdit) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or report data missing.' });
      return { success: false };
    }

    let finalPhotoDataUri: string | undefined = reportToEdit.photoDataUri;

    if (photoFile === null) { 
      finalPhotoDataUri = undefined;
    } else if (photoFile) { 
      try {
        finalPhotoDataUri = await readFileAsDataURL(photoFile);
      } catch (error) {
        console.error("Error reading photo file for update:", error);
        toast({ variant: 'destructive', title: 'Photo Error', description: 'Could not process the new photo.' });
        return { success: false };
      }
    }
    
    const tempReportForAI: FieldReport = {
        ...reportToEdit, // Start with existing data
        ...data, // Overlay with form data
        photoDataUri: finalPhotoDataUri,
        status: status, // Use the new status for AI check
        updatedAt: new Date().toISOString(), // Approximate for AI check
    };
    const assessment = await detectReportAnomaly(tempReportForAI);

    if (status === 'SUBMITTED' && assessment.isAnomalous) {
      return { success: false, anomalyAssessment: assessment };
    }

    const reportDataToUpdate: Partial<Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'projectId'>> = {
      ...data,
      status: status, 
      photoDataUri: finalPhotoDataUri,
    };

    try {
      await updateReport(reportToEdit.id, reportDataToUpdate);
      // If it was a draft and had an anomaly, the assessment is still returned for informational purposes.
      // If it was submitted without anomaly, that's also returned.
      if (status === 'SUBMITTED') { // Only navigate away if it was a successful submission
          router.push('/reports'); 
      }
      return { success: true, reportId: reportToEdit.id, anomalyAssessment: assessment };
    } catch (error) {
      console.error('Error updating report:', error);
      return { success: false, anomalyAssessment: assessment };
    }
  };

  if (authLoading || isLoadingReport) {
    return (
      <>
        <PageTitle title="Edit Field Report" icon={FileText} subtitle="Loading report data..." />
        <Skeleton className="h-[500px] w-full" />
      </>
    );
  }

  if (errorLoadingReport) {
    return (
      <>
        <PageTitle title="Error Loading Report" icon={AlertTriangleIcon} subtitle={errorLoadingReport} />
        <Button variant="outline" asChild className="rounded-lg">
          <Link href="/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports</Link>
        </Button>
         <Card className="mt-4">
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent><p>{errorLoadingReport}</p></CardContent>
        </Card>
      </>
    );
  }
  
  if (!reportToEdit) {
     return (
      <>
        <PageTitle title="Report Not Found" icon={AlertTriangleIcon} subtitle={`Could not find report with ID ${reportId}.`} />
        <Button variant="outline" asChild className="rounded-lg">
          <Link href="/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageTitle 
        title="Edit Field Report" 
        icon={FileText}
        subtitle={`Modifying report ID: ${reportToEdit.id}`}
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
               <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Back to Reports
            </Link>
          </Button>
        }
      />
      <ReportForm
        reportToEdit={reportToEdit}
        onSubmitReport={handleUpdateReportSubmit}
        isLoadingExternally={isLoadingReport}
      />
    </>
  );
}
