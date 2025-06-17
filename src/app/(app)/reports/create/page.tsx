
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
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';


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
      toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour créer un rapport.' });
      return { success: false };
    }
    
    const reportTechnicianId = user.email === MOCK_TECHNICIAN_EMAIL ? MOCK_TECHNICIAN_REPORTS_ID : user.uid;
    

    let photoDataUriInSubmit: string | undefined = undefined;
    if (photoFile) {
      try {
        photoDataUriInSubmit = await readFileAsDataURL(photoFile);
      } catch (error) {
        console.error("Erreur de lecture du fichier photo pour le nouveau rapport:", error);
        toast({ variant: 'destructive', title: 'Erreur Photo', description: 'Impossible de traiter la photo.' });
        return { success: false };
      }
    }
    
    const tempReportForAI: FieldReport = {
        ...data, 
        technicianId: reportTechnicianId,
        photoDataUri: photoDataUriInSubmit,
        id: 'temp-ai-check', 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
        status: status,
    };
    
    const assessment = await detectReportAnomaly(tempReportForAI);

    if (status === 'SUBMITTED' && assessment.isAnomalous) {
      return { success: false, anomalyAssessment: assessment };
    }

    const reportDataToSave: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data, 
      technicianId: reportTechnicianId,
      photoDataUri: photoDataUriInSubmit, 
      status: status,
      aiIsAnomalous: assessment.isAnomalous,
      aiAnomalyExplanation: assessment.explanation,
    };

    try {
      const newReportId = await addReport(reportDataToSave);
      return { success: true, reportId: newReportId, anomalyAssessment: assessment };
    } catch (error) {
      console.error('Erreur de création du rapport:', error);
      return { success: false, anomalyAssessment: assessment }; 
    }
  };


  return (
    <>
      <PageTitle 
        title="Créer un Nouveau Rapport de Terrain" 
        icon={FileText}
        subtitle="Remplissez les détails ci-dessous pour soumettre un nouveau rapport de terrain et obtenir une détection d'anomalie assistée par IA."
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
               <ArrowLeft className="mr-2 h-4 w-4" /> Annuler & Retour aux Rapports
            </Link>
          </Button>
        }
      />
      <ReportForm onSubmitReport={handleCreateReportSubmit} />
    </>
  );
}
