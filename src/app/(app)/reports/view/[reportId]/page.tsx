
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageTitle } from '@/components/common/PageTitle';
import { FileText, ArrowLeft, Loader2, AlertTriangleIcon, Image as ImageIcon, CalendarDays, User, Tag, Thermometer, Beaker, BarChart3, AlignLeft, Paperclip, ShieldCheck, ShieldX, HardHat, Users as UsersIcon, ClipboardList, Scale, Droplets, CalendarClock, Sparkles, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getReportById } from '@/services/reportService';
import type { FieldReport } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Image from 'next/image'; 
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils'; 

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
};

const materialTypeDisplay: Record<string, string> = {
  cement: "Cement",
  asphalt: "Asphalt",
  gravel: "Gravel",
  sand: "Sand",
  other: "Other",
};

const samplingMethodDisplay: Record<string, string> = {
  grab: "Grab Sample",
  composite: "Composite Sample",
  core: "Core Sample",
  other: "Other Method",
};

const DetailItem: React.FC<{ icon: React.ElementType, label: string, value?: string | number | null | boolean, children?: React.ReactNode, valueClass?: string }> = ({ icon: Icon, label, value, children, valueClass }) => (
  <div className="flex items-start space-x-3">
    <Icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {children ? (
        <div className={cn("text-base font-medium text-foreground", valueClass)}>{children}</div>
      ) : (
        <p className={cn("text-base font-medium text-foreground", valueClass)}>{value === true ? 'Yes' : value === false ? 'No' : (value ?? 'N/A')}</p>
      )}
    </div>
  </div>
);


export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();
  const { reportId } = params as { reportId: string };
  
  const { user, loading: authLoading } = useAuth();
  const [report, setReport] = useState<FieldReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(true);
  const [errorLoadingReport, setErrorLoadingReport] = useState<string | null>(null);

  useEffect(() => {
    if (reportId && user) { 
      setIsLoadingReport(true);
      setErrorLoadingReport(null);
      getReportById(reportId)
        .then(data => {
          if (data) {
            setReport(data);
          } else {
            setErrorLoadingReport(`Rapport avec ID ${reportId} non trouvé.`);
          }
        })
        .catch(err => {
          console.error("Error fetching report for viewing:", err);
          setErrorLoadingReport("Échec du chargement des détails du rapport.");
        })
        .finally(() => setIsLoadingReport(false));
    } else if (!user && !authLoading) {
        setIsLoadingReport(false);
        setErrorLoadingReport("Vous devez être connecté pour voir les rapports.");
    }
  }, [reportId, user, authLoading]);

  if (authLoading || isLoadingReport) {
    return (
      <>
        <PageTitle title="Détails du Rapport" icon={FileText} subtitle="Chargement des données du rapport..." />
        <Card className="shadow-lg">
          <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  if (errorLoadingReport) {
    return (
      <>
        <PageTitle title="Erreur de Chargement" icon={AlertTriangleIcon} subtitle={errorLoadingReport} />
        <Button variant="outline" asChild className="rounded-lg">
          <Link href="/reports"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Rapports</Link>
        </Button>
      </>
    );
  }
  
  if (!report) {
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
        title={`Détails du Rapport: ${report.id.substring(0,8)}...`}
        icon={FileText}
        subtitle={`Projet ID: ${report.projectId}`}
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/reports">
               <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Rapports
            </Link>
          </Button>
        }
      />

      {report.status === 'REJECTED' && report.rejectionReason && (
        <Alert variant="destructive" className="mb-6">
          <ShieldX className="h-5 w-5" />
          <AlertTitle className="font-semibold">Ce rapport a été rejeté</AlertTitle>
          <AlertDescription>
            <p className="font-medium mt-1">Raison du rejet :</p>
            <p className="whitespace-pre-wrap">{report.rejectionReason}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl">
          <CardHeader>
            <CardTitle>Informations Générales</CardTitle>
            <CardDescription>Détails principaux du rapport et du matériel testé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem icon={Tag} label="ID Rapport" value={report.id} />
              <DetailItem icon={HardHat} label="ID Projet" value={report.projectId} />
              <DetailItem icon={User} label="ID Technicien" value={report.technicianId} />
              <DetailItem icon={Beaker} label="Type de Matériau">
                <Badge variant={reportStatusBadgeVariant[report.materialType as FieldReport['status']] || "outline"}>
                    {materialTypeDisplay[report.materialType] || report.materialType}
                </Badge>
              </DetailItem>
              <DetailItem icon={Tag} label="Numéro de Lot" value={report.batchNumber} />
              <DetailItem icon={UsersIcon} label="Fournisseur" value={report.supplier} />
              <DetailItem icon={ClipboardList} label="Méthode d'Échantillonnage" value={samplingMethodDisplay[report.samplingMethod] || report.samplingMethod} />
               <DetailItem icon={ShieldCheck} label="Statut du Rapport">
                <Badge variant={reportStatusBadgeVariant[report.status]}>
                  {report.status}
                </Badge>
              </DetailItem>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Mesures & Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <DetailItem icon={Thermometer} label="Température" value={`${report.temperature} °C`} />
             <DetailItem icon={BarChart3} label="Volume" value={`${report.volume} m³`} />
             <DetailItem icon={Scale} label="Densité" value={`${report.density} kg/m³`} />
             <DetailItem icon={Droplets} label="Humidité" value={`${report.humidity} %`} />
             <DetailItem icon={CalendarDays} label="Créé le" value={format(new Date(report.createdAt), 'PPpp')} />
             <DetailItem icon={CalendarClock} label="Mis à jour le" value={format(new Date(report.updatedAt), 'PPpp')} />
          </CardContent>
        </Card>

        {report.photoDataUri && (
          <Card className="lg:col-span-3 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary"/>Photo du Matériel/Site</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center">
              <Image 
                src={report.photoDataUri} 
                alt={`Photo pour le rapport ${report.id}`} 
                width={600} 
                height={400} 
                className="rounded-lg object-contain max-h-[500px] shadow-md"
                data-ai-hint="material sample construction" 
              />
            </CardContent>
          </Card>
        )}
        
        {(report.aiIsAnomalous !== undefined || report.aiAnomalyExplanation) && (
           <Card className="lg:col-span-3 shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center">
                    {report.aiIsAnomalous ? <AlertTriangleIcon className="mr-2 h-5 w-5 text-destructive"/> : <Sparkles className="mr-2 h-5 w-5 text-green-500"/>}
                    Évaluation par l'IA
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <DetailItem icon={Cpu} label="Anomalie Détectée par l'IA ?" value={report.aiIsAnomalous} valueClass={report.aiIsAnomalous ? "text-destructive" : "text-green-600"} />
                {report.aiAnomalyExplanation && (
                     <DetailItem icon={AlignLeft} label="Explication de l'IA">
                        <p className="text-base font-normal text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                        {report.aiAnomalyExplanation}
                        </p>
                    </DetailItem>
                )}
            </CardContent>
            </Card>
        )}


        {(report.notes || (report.attachments && report.attachments.length > 0)) && (
            <Card className="lg:col-span-3 shadow-xl">
            <CardHeader>
                <CardTitle>Informations Additionnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {report.notes && (
                <DetailItem icon={AlignLeft} label="Notes du Technicien">
                    <p className="text-base font-normal text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                    {report.notes}
                    </p>
                </DetailItem>
                )}
                {report.attachments && report.attachments.length > 0 && (
                <DetailItem icon={Paperclip} label="Pièces Jointes (URLs)">
                    <ul className="list-disc list-inside space-y-1">
                    {report.attachments.map((url, index) => (
                        <li key={index}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                            {url}
                        </a>
                        </li>
                    ))}
                    </ul>
                </DetailItem>
                )}
            </CardContent>
            </Card>
        )}
      </div>
    </>
  );
}
