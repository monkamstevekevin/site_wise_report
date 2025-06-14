
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, Filter, Loader2, AlertTriangleIcon, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ReportTable } from './components/ReportTable';
import { RejectionReasonDialog } from './components/RejectionReasonDialog'; // Added
import type { FieldReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';
import { getReports, getReportsByTechnicianId, deleteReport as deleteReportService, updateReport } from '@/services/reportService'; 
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
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'REJECTED', label: 'Rejected' },
];

const materialTypeFilterOptions: { value: FieldReport['materialType'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Material Types' },
  { value: 'cement', label: 'Cement' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'other', label: 'Other' },
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


  const fetchReportsForUser = async () => {
    if (authLoading || !user) {
      setIsLoadingReports(false);
      if (!authLoading && !user) setAllFetchedReports([]); 
      return;
    }

    setIsLoadingReports(true);
    setReportsError(null);
    const { role, effectiveTechnicianId: mappedTechId } = mapFirebaseUserToAppRoleAndId(user);
    setCurrentUserRole(role);
    setEffectiveTechnicianId(mappedTechId);
    console.log(`[ReportsPage] Logged in user: ${user.email}, Determined Role: ${role}`);
    console.log(`[ReportsPage] ID that WILL BE USED for technician's report query (effectiveTechnicianId): ${mappedTechId}`);


    try {
      let fetchedReports: FieldReport[] = [];
      if (role === 'TECHNICIAN' && mappedTechId) {
        console.log(`[ReportsPage] Querying Firestore for reports where technicianId == "${mappedTechId}"`);
        fetchedReports = await getReportsByTechnicianId(mappedTechId);
        console.log(`[ReportsPage] Firestore returned ${fetchedReports.length} reports for technicianId "${mappedTechId}".`);
        if (fetchedReports.length === 0) {
            console.log(`[ReportsPage] No reports found in Firestore for technicianId "${mappedTechId}". Ensure a report exists with this exact technicianId in its 'technicianId' field.`);
        } else {
            console.log('[ReportsPage] Fetched reports details:', fetchedReports.map(r => ({id: r.id, projectId: r.projectId, techIdOnReport: r.technicianId, status: r.status})));
        }

      } else if (role === 'ADMIN' || role === 'SUPERVISOR') {
        console.log("[ReportsPage] Admin/Supervisor fetching all reports.");
        fetchedReports = await getReports();
        console.log(`[ReportsPage] Firestore returned ${fetchedReports.length} total reports for Admin/Supervisor.`);
      } else {
        console.log("[ReportsPage] No specific role match or missing technicianId for TECHNICIAN, fetching no reports.");
        fetchedReports = [];
      }
      setAllFetchedReports(fetchedReports);
      
      if (fetchedReports.length === 0 && role === 'TECHNICIAN' && mappedTechId) {
          // This condition is now handled by the more detailed logging above.
      }

    } catch (err) {
      setReportsError((err as Error).message || "Failed to load reports.");
      setAllFetchedReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReportsForUser();
  }, [user, authLoading]);


  const handleEditReport = (report: FieldReport) => {
    // Permission logic is now more refined within ReportTable and EditPage itself
    router.push(`/reports/edit/${report.id}`);
  };

  const openDeleteDialog = (report: FieldReport) => {
    // Permission logic is now more refined within ReportTable
    setReportToDelete(report);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await deleteReportService(reportToDelete.id);
      toast({
        title: "Report Deleted",
        description: `Report ID: ${reportToDelete.id} has been deleted.`,
      });
      await fetchReportsForUser(); 
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Delete Report",
        description: (err as Error).message || "An unexpected error occurred.",
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
      await fetchReportsForUser();
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
    setIsRejectionDialogOpen(false); // Close dialog immediately
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
      await fetchReportsForUser();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erreur de Rejet', description: (err as Error).message || "Une erreur s'est produite." });
      setIsRejectionDialogOpen(true); // Re-open dialog on error if needed, or handle differently
    } finally {
       setReportToReject(null); // Clear the report to reject
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
        <PageTitle title="Field Reports" icon={FileText} subtitle="Loading reports..." />
        <Skeleton className="h-24 w-full mb-6 rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </>
    );
  }

  if (!user && !authLoading) {
    return (
      <>
        <PageTitle title="Field Reports" icon={FileText} subtitle="Please log in to view reports." />
        <div className="text-center py-10">
          <p className="text-muted-foreground">You need to be logged in to access this page.</p>
          <Button asChild className="mt-4 rounded-lg">
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={currentUserRole === 'TECHNICIAN' ? "My Field Reports" : "All Field Reports"}
        icon={FileText}
        subtitle={currentUserRole === 'TECHNICIAN' ? "Manage and review your submitted field reports." : "Manage and review all submitted field reports."}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/reports/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Report
            </Link>
          </Button>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="lg:col-span-2">
            <Label htmlFor="report-search" className="mb-1 block text-sm font-medium">Search Reports</Label>
            <Input
              id="report-search"
              type="text"
              placeholder="Search by ID, Project, Supplier, Batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="report-status-filter" className="mb-1 block text-sm font-medium">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={(value: FieldReport['status'] | 'ALL') => setStatusFilter(value)}>
              <SelectTrigger className="w-full" id="report-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {reportStatusFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-material-filter" className="mb-1 block text-sm font-medium">Filter by Material</Label>
            <Select value={materialFilter} onValueChange={(value: FieldReport['materialType'] | 'ALL') => setMaterialFilter(value)}>
              <SelectTrigger className="w-full" id="report-material-filter">
                <SelectValue placeholder="Filter by material" />
              </SelectTrigger>
              <SelectContent>
                {materialTypeFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMaterialFilter('ALL'); }} className="h-10 w-full lg:w-auto rounded-lg">
            <Filter className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </div>

      {isLoadingReports && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading reports...
        </div>
      )}
      {reportsError && !isLoadingReports && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangleIcon className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Error Loading Reports</p>
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
            onRejectReport={handleOpenRejectionDialog} // Updated prop
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
              <AlertDialogTitle>Confirm Report Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the report ID: "{reportToDelete?.id}" for project "{reportToDelete?.projectId}"? This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RejectionReasonDialog
        open={isRejectionDialogOpen}
        onOpenChange={(open) => {
          setIsRejectionDialogOpen(open);
          if (!open) setReportToReject(null); // Clear report when dialog closes
        }}
        report={reportToReject}
        onConfirmRejection={handleConfirmRejection}
      />
    </>
  );
}
