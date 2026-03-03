
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, Filter, Loader2, AlertTriangleIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ReportTable } from './components/ReportTable';
import { RejectionReasonDialog } from './components/RejectionReasonDialog';
import type { FieldReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';
import { getReportsSubscription, getReportsByTechnicianIdSubscription } from '@/lib/reportClientService';
import { deleteReport as deleteReportService, updateReport } from '@/services/reportService'; 
import { useRouter } from 'next/navigation'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const reportStatusFilterOptions: { value: FieldReport['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SUBMITTED', label: 'Soumis' },
  { value: 'VALIDATED', label: 'Validé' },
  { value: 'REJECTED', label: 'Rejeté' },
];

const materialTypeFilterOptions: { value: FieldReport['materialType'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Types de Matériaux' },
  { value: 'cement', label: 'Ciment' },
  { value: 'asphalt', label: 'Asphalte' },
  { value: 'gravel', label: 'Gravier' },
  { value: 'sand', label: 'Sable' },
  { value: 'other', label: 'Autre' },
];

interface MappedUserRoleAndId {
  role: UserRole;
  effectiveTechnicianId: string | null;
}

const mapFirebaseUserToAppRoleAndId = (firebaseUser: any): MappedUserRoleAndId => {
  if (!firebaseUser) return { role: 'TECHNICIAN', effectiveTechnicianId: null };

  if (firebaseUser.email === 'janesteve237@gmail.com') {
    return { role: 'ADMIN', effectiveTechnicianId: null }; 
  }
  
  if (firebaseUser.email?.includes('admin@example.com')) return { role: 'ADMIN', effectiveTechnicianId: null };
  if (firebaseUser.email?.includes('supervisor@example.com')) return { role: 'SUPERVISOR', effectiveTechnicianId: null };

  if (firebaseUser.email === MOCK_TECHNICIAN_EMAIL) { 
    return { role: 'TECHNICIAN', effectiveTechnicianId: MOCK_TECHNICIAN_REPORTS_ID }; 
  }

  return { role: 'TECHNICIAN', effectiveTechnicianId: firebaseUser.uid };
};


export default function ReportsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); 

  const [allFetchedReports, setAllFetchedReports] = useState<FieldReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [effectiveTechnicianId, setEffectiveTechnicianId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FieldReport['status'] | 'ALL'>('ALL');
  const [materialFilter, setMaterialFilter] = useState<FieldReport['materialType'] | 'ALL'>('ALL');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<FieldReport | null>(null);

  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [reportToReject, setReportToReject] = useState<FieldReport | null>(null);

  useEffect(() => {
    if (authLoading) {
      setIsLoadingReports(true);
      return;
    }
    if (!user) {
        setIsLoadingReports(false);
        setAllFetchedReports([]);
        return;
    }

    const { role, effectiveTechnicianId: mappedTechId } = mapFirebaseUserToAppRoleAndId(user);
    setCurrentUserRole(role);
    setEffectiveTechnicianId(mappedTechId);
    
    let unsubscribe = () => {};

    const onUpdate = (fetchedReports: FieldReport[]) => {
        setAllFetchedReports(fetchedReports);
        setReportsError(null);
        setIsLoadingReports(false);
    };
    const onError = (err: Error) => {
        setReportsError((err as Error).message || "Échec du chargement des rapports.");
        setAllFetchedReports([]);
        setIsLoadingReports(false);
    };

    if (role === 'TECHNICIAN' && mappedTechId) {
        unsubscribe = getReportsByTechnicianIdSubscription(mappedTechId, onUpdate, onError);
    } else if (role === 'ADMIN' || role === 'SUPERVISOR') {
        unsubscribe = getReportsSubscription(onUpdate, onError);
    } else {
        setIsLoadingReports(false);
        setAllFetchedReports([]);
    }

    return () => unsubscribe();
  }, [user, authLoading]);


  const handleEditReport = (report: FieldReport) => {
    router.push(`/reports/edit/${report.id}`);
  };

  const openDeleteDialog = (report: FieldReport) => {
    setReportToDelete(report);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await deleteReportService(reportToDelete.id);
      toast({
        title: "Rapport Supprimé",
        description: `Le rapport ID: ${reportToDelete.id} a été supprimé.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Échec de la Suppression du Rapport",
        description: (err as Error).message || "Une erreur inattendue s'est produite.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const handleValidateReport = async (report: FieldReport) => {
    if (report.status !== 'SUBMITTED') {
      toast({ variant: 'destructive', title: 'Action non autorisée', description: 'Seuls les rapports soumis peuvent être validés.' });
      return;
    }
    try {
      await updateReport(report.id, { status: 'VALIDATED' });
      toast({ title: 'Rapport Validé', description: `Le rapport ID: ${report.id} a été marqué comme VALIDÉ.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur de Validation', description: (err as Error).message || "Une erreur s'est produite." });
    }
  };

  const handleOpenRejectionDialog = (report: FieldReport) => {
    if (report.status !== 'SUBMITTED') {
      toast({ variant: 'destructive', title: 'Action non autorisée', description: 'Seuls les rapports soumis peuvent être rejetés.' });
      return;
    }
    setReportToReject(report);
    setIsRejectionDialogOpen(true);
  };

  const handleConfirmRejection = async (reportId: string, reason: string) => {
    setIsRejectionDialogOpen(false); 
    try {
      await updateReport(reportId, { status: 'REJECTED', rejectionReason: reason });
      toast({ 
        title: 'Rapport Rejeté', 
        description: (
          <div>
            <p>Le rapport ID: {reportId} a été marqué comme REJETÉ.</p>
            <p className="text-xs mt-1">Raison: {reason}</p>
          </div>
        )
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur de Rejet', description: (err as Error).message || "Une erreur s'est produite." });
      setIsRejectionDialogOpen(true);
    } finally {
       setReportToReject(null); 
    }
  };


  const filteredReports = useMemo(() => {
    return allFetchedReports.filter(report => {
      const matchesSearchTerm = searchTerm === '' ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.supplier && report.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        report.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesMaterial = materialFilter === 'ALL' || report.materialType === materialFilter;

      return matchesSearchTerm && matchesStatus && matchesMaterial;
    });
  }, [allFetchedReports, searchTerm, statusFilter, materialFilter]);

  if (authLoading || (user && currentUserRole === null && !isLoadingReports) ) {
    return (
      <>
        <PageTitle title="Rapports de Terrain" icon={FileText} subtitle="Chargement des rapports..." />
        <Skeleton className="h-24 w-full mb-6 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </>
    );
  }

  if (!user && !authLoading) {
    return (
      <>
        <PageTitle title="Rapports de Terrain" icon={FileText} subtitle="Veuillez vous connecter pour voir les rapports." />
        <div className="text-center py-10">
          <p className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</p>
          <Button asChild className="mt-4 rounded-lg">
            <Link href="/auth/login">Connexion</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={currentUserRole === 'TECHNICIAN' ? "Mes Rapports de Terrain" : "Tous les Rapports de Terrain"}
        icon={FileText}
        subtitle={currentUserRole === 'TECHNICIAN' ? "Gérez et révisez vos rapports de terrain soumis." : "Gérez et révisez tous les rapports de terrain soumis."}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Créer un Nouveau Rapport
            </Link>
          </Button>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <Label htmlFor="report-search" className="mb-1 block text-sm font-medium">Rechercher des Rapports</Label>
            <Input
              id="report-search"
              type="text"
              placeholder="Rechercher par ID, Projet, Fournisseur, Lot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="report-status-filter" className="mb-1 block text-sm font-medium">Filtrer par Statut</Label>
            <Select value={statusFilter} onValueChange={(value: FieldReport['status'] | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-full" id="report-status-filter">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                {reportStatusFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-material-filter" className="mb-1 block text-sm font-medium">Filtrer par Matériau</Label>
            <Select value={materialFilter} onValueChange={(value: FieldReport['materialType'] | 'ALL') => setMaterialFilter(value)}>
              <SelectTrigger className="w-full" id="report-material-filter">
                <SelectValue placeholder="Filtrer par matériau" />
              </SelectTrigger>
              <SelectContent>
                {materialTypeFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMaterialFilter('ALL'); }} className="h-10 w-full lg:w-auto rounded-lg">
            <Filter className="mr-2 h-4 w-4" /> Tout Effacer
          </Button>
        </div>
      </div>

      {isLoadingReports && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Chargement des rapports...
        </div>
      )}
      {reportsError && !isLoadingReports && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangleIcon className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Erreur de Chargement des Rapports</p>
           <p>{reportsError}</p>
         </div>
      )}
      {!isLoadingReports && !reportsError && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          <ReportTable
            reports={filteredReports}
            onEditReport={handleEditReport}
            onDeleteReport={openDeleteDialog} 
            onValidateReport={handleValidateReport}
            onRejectReport={handleOpenRejectionDialog}
            currentUserId={effectiveTechnicianId || user?.uid} 
            currentUserRole={currentUserRole}
          />
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
              <AlertDialogTitle>Confirmer la Suppression du Rapport</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le rapport ID: "{reportToDelete?.id}" pour le projet "{reportToDelete?.projectId}"? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer le Rapport
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectionReasonDialog
        open={isRejectionDialogOpen}
        onOpenChange={(open) => {
          setIsRejectionDialogOpen(open);
          if (!open) setReportToReject(null);
        }}
        report={reportToReject}
        onConfirmRejection={handleConfirmRejection}
      />
    </>
  );
}
