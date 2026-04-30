
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReportForm, type ReportSubmitPayload } from './components/ReportForm';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeGate } from '@/components/common/UpgradeGate';
import { addReport } from '@/services/reportService';
import { detectReportAnomaly, type AnomalyAssessment } from '@/ai/flows/report-anomaly-detection';
import { notifyReportSubmitted } from '@/actions/notifications';
import type { FieldReport } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { uploadReportPhoto } from '@/lib/uploadPhoto';

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
    
    const reportTechnicianId = user.id;


    let photoDataUriInSubmit: string | undefined = undefined;
    if (photoFile) {
      try {
        photoDataUriInSubmit = await uploadReportPhoto(photoFile);
      } catch (error) {
        console.error("Erreur d'upload de la photo:", error);
        toast({ variant: 'destructive', title: 'Erreur Photo', description: 'Impossible d\'uploader la photo. Vérifiez que le bucket Supabase Storage "report-photos" est configuré.' });
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
    
    let assessment: Awaited<ReturnType<typeof detectReportAnomaly>>;
    try {
      assessment = await detectReportAnomaly(tempReportForAI);
    } catch (e) {
      console.error('Anomaly detection failed, proceeding without AI:', e);
      assessment = { isAnomalous: false, explanation: 'Analyse IA temporairement indisponible.' };
    }

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
      // Notifier les superviseurs/admins si le rapport est soumis
      if (status === 'SUBMITTED') {
        notifyReportSubmitted(newReportId).catch(() => {});
      }
      return { success: true, reportId: newReportId, anomalyAssessment: assessment };
    } catch (error) {
      console.error('Erreur de création du rapport:', error);
      return { success: false, anomalyAssessment: assessment }; 
    }
  };


  return (
    <UpgradeGate>
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
    </UpgradeGate>
  );
}
