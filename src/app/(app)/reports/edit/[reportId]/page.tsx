
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTitle } from '@/components/common/PageTitle';
import { FileText, ArrowLeft, Loader2, AlertTriangleIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReportForm, type ReportSubmitPayload } from '@/app/(app)/reports/create/components/ReportForm'; // Reusing the form
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getReportById, updateReport } from '@/services/reportService';
import { detectReportAnomaly, type FieldReport, type AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';


const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const mapFirebaseUserToAppRole = (firebaseUser: any): UserRole => {
  if (!firebaseUser || !firebaseUser.email) return 'TECHNICIAN'; 
  if (firebaseUser.email === 'janesteve237@gmail.com') return 'ADMIN';
  if (firebaseUser.email.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
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
            const currentUserRole = mapFirebaseUserToAppRole(user);
            const effectiveTechnicianId = user.email === MOCK_TECHNICIAN_EMAIL ? MOCK_TECHNICIAN_REPORTS_ID : user.uid;
            const isOwner = data.technicianId === effectiveTechnicianId;

            let canAccessEditPage = false;
             if (currentUserRole === 'TECHNICIAN' && isOwner && (data.status === 'DRAFT' || data.status === 'REJECTED')) {
              canAccessEditPage = true;
            } else if ((currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (data.status === 'DRAFT' || data.status === 'SUBMITTED')) {
              canAccessEditPage = true;
            }

            if (canAccessEditPage) {
                 setReportToEdit(data);
            } else {
                setErrorLoadingReport("Vous n'avez pas la permission de modifier ce rapport ou il n'est pas dans un état modifiable (Technicien: Brouillon/Rejeté uniquement; Admin/Sup: Brouillon/Soumis uniquement).");
                toast({variant: "destructive", title: "Permission Refusée", description: "Impossible de modifier ce rapport."});
            }
          } else {
            setErrorLoadingReport(`Rapport avec ID ${reportId} non trouvé.`);
          }
        })
        .catch(err => {
          console.error("Error fetching report for editing:", err);
          setErrorLoadingReport("Échec du chargement des données du rapport pour modification.");
        })
        .finally(() => setIsLoadingReport(false));
    } else if (!user && !authLoading) {
        setIsLoadingReport(false);
        setErrorLoadingReport("Vous devez être connecté pour modifier les rapports.");
    }

  }, [reportId, user, authLoading, toast]);

  const handleUpdateReportSubmit = async (
    data: ReportSubmitPayload,
    status: 'DRAFT' | 'SUBMITTED',
    photoFile?: File | null | undefined
  ): Promise<{ success: boolean; reportId?: string; anomalyAssessment?: AnomalyAssessment }> => {
    if (!user || !reportToEdit) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Données utilisateur ou rapport manquantes.' });
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
        toast({ variant: 'destructive', title: 'Erreur Photo', description: 'Impossible de traiter la nouvelle photo.' });
        return { success: false };
      }
    }
    
    const tempReportForAI: FieldReport = {
        ...reportToEdit, 
        ...data, 
        photoDataUri: finalPhotoDataUri,
        status: status, 
        updatedAt: new Date().toISOString(),
        // aiIsAnomalous and aiAnomalyExplanation will be populated by detectReportAnomaly
    };
    const assessment = await detectReportAnomaly(tempReportForAI);

    if (status === 'SUBMITTED' && assessment.isAnomalous) {
       // Even if submission is blocked, we might want to save the AI assessment
      // For now, just return to the form
      return { success: false, anomalyAssessment: assessment };
    }

    const finalStatus = reportToEdit.status === 'REJECTED' && status === 'SUBMITTED' ? 'SUBMITTED' : status;
    
    const reportDataToUpdate: Partial<Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'projectId'>> & { rejectionReason?: string | null } = {
      ...data,
      status: finalStatus, 
      photoDataUri: finalPhotoDataUri,
      aiIsAnomalous: assessment.isAnomalous,
      aiAnomalyExplanation: assessment.explanation,
    };
    
    if (finalStatus === 'SUBMITTED' && reportToEdit.status === 'REJECTED') {
        reportDataToUpdate.rejectionReason = null; 
    }


    try {
      await updateReport(reportToEdit.id, reportDataToUpdate);
      
      if (status === 'SUBMITTED') { 
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
        <PageTitle title="Modifier Rapport de Terrain" icon={FileText} subtitle="Chargement des données du rapport..." />
        <Skeleton className="h-[500px] w-full" />
      </>
    );
  }

  if (errorLoadingReport) {
    return (
      <>
        <PageTitle title="Erreur de Chargement du Rapport" icon={AlertTriangleIcon} subtitle={errorLoadingReport} />
        <Button variant="outline" asChild className="rounded-lg">
          <Link href="/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Rapports</Link>
        </Button>
         <Card className="mt-4">
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent><p>{errorLoadingReport}</p></CardContent>
        </Card>
      </>
    );
  }
  
  if (!reportToEdit) {
     return (
      <>
        <PageTitle title="Rapport Non Trouvé" icon={AlertTriangleIcon} subtitle={`Impossible de trouver le rapport avec ID ${reportId}.`} />
        <Button variant="outline" asChild className="rounded-lg">
          <Link href="/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Rapports</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageTitle 
        title="Modifier Rapport de Terrain" 
        icon={FileText}
        subtitle={`Modification du rapport ID: ${reportToEdit.id}. Statut actuel: ${reportToEdit.status}`}
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
               <ArrowLeft className="mr-2 h-4 w-4" /> Annuler & Retour aux Rapports
            </Link>
          </Button>
        }
      />
      {reportToEdit.status === 'REJECTED' && reportToEdit.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Rapport Rejeté</AlertTitle>
          <AlertDescription>
            <p className="font-semibold">Raison du rejet :</p>
            <p className="whitespace-pre-wrap">{reportToEdit.rejectionReason}</p>
            <p className="mt-2">Veuillez corriger les informations ci-dessous et resoumettre le rapport.</p>
          </AlertDescription>
        </Alert>
      )}
      <ReportForm
        reportToEdit={reportToEdit}
        onSubmitReport={handleUpdateReportSubmit}
        isLoadingExternally={isLoadingReport}
      />
    </>
  );
}
