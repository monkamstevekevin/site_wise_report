
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, Filter } from 'lucide-react';
import Link from 'next/link';
import { ReportTable } from './components/ReportTable';
import type { FieldReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext'; // For filtering by technician
import { Skeleton } from '@/components/ui/skeleton';

// Moved mockReports here - make it exportable if needed elsewhere, but for now it's local
export const mockReportsData: FieldReport[] = [
  {
    id: 'RPT001',
    projectId: 'PJT001',
    technicianId: 'USR003', // Aisha Khan
    materialType: 'cement',
    temperature: 22.5,
    volume: 15.0,
    density: 1480,
    humidity: 65,
    batchNumber: 'CMT-A-101',
    supplier: 'Acme Materials',
    samplingMethod: 'grab',
    notes: 'Standard concrete pour for foundation slab. Weather clear.',
    status: 'VALIDATED',
    attachments: ['https://example.com/docs/PJT001_spec.pdf'],
    createdAt: new Date('2024-05-10T10:30:00Z').toISOString(),
    updatedAt: new Date('2024-05-11T09:00:00Z').toISOString(),
  },
  {
    id: 'RPT002',
    projectId: 'PJT002',
    technicianId: 'USR004', // David Lee
    materialType: 'asphalt',
    temperature: 150.2,
    volume: 50.0,
    density: 2300,
    humidity: 30,
    batchNumber: 'ASP-B-202',
    supplier: 'BuildIt Co.',
    samplingMethod: 'core',
    notes: 'Asphalt laying for main road, section 2. Compaction test passed.',
    status: 'SUBMITTED',
    attachments: [],
    photoDataUri: 'https://placehold.co/600x400.png',
    createdAt: new Date('2024-05-12T14:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-12T14:00:00Z').toISOString(),
  },
  {
    id: 'RPT003',
    projectId: 'PJT001',
    technicianId: 'USR003', // Aisha Khan
    materialType: 'gravel',
    temperature: 18.0,
    volume: 100.0,
    density: 1700,
    humidity: 55,
    batchNumber: 'GRV-C-303',
    supplier: 'RockSolid Inc.',
    samplingMethod: 'composite',
    notes: 'Sub-base layer compaction. Minor moisture detected.',
    status: 'REJECTED',
    attachments: [],
    createdAt: new Date('2024-05-09T11:15:00Z').toISOString(),
    updatedAt: new Date('2024-05-10T16:45:00Z').toISOString(),
  },
  {
    id: 'RPT004',
    projectId: 'PJT003',
    technicianId: 'USR006', // Robert Downy
    materialType: 'sand',
    temperature: 25.0,
    volume: 30.0,
    density: 1650,
    humidity: 40,
    batchNumber: 'SND-D-404',
    supplier: 'Quality Aggregates',
    samplingMethod: 'grab',
    notes: 'Fine sand for masonry work. Sample appears consistent.',
    status: 'DRAFT',
    attachments: [],
    createdAt: new Date('2024-05-13T09:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-13T09:30:00Z').toISOString(),
  },
  {
    id: 'RPT005',
    projectId: 'PJT004',
    technicianId: 'USR003', // Aisha Khan
    materialType: 'other',
    temperature: 20,
    volume: 5,
    density: 1200,
    humidity: 50,
    batchNumber: 'GEO-E-505',
    supplier: 'Acme Materials',
    samplingMethod: 'other',
    notes: 'Geotextile fabric installation under review.',
    status: 'SUBMITTED',
    attachments: ['https://example.com/docs/geotextile_spec.pdf'],
    createdAt: new Date('2024-05-11T15:00:00Z').toISOString(),
    updatedAt: new Date('2024-05-11T15:00:00Z').toISOString(),
  },
  { // Add a DRAFT report for the currently logged-in user if they are a technician
    id: 'RPT006',
    projectId: 'PJT001',
    // This technicianId will be dynamically checked against the logged-in user
    technicianId: 'UNIQUE_TECHNICIAN_ID_PLACEHOLDER', // Replace with actual ID for testing
    materialType: 'cement',
    temperature: 20, volume: 10, density: 1450, humidity: 70,
    batchNumber: 'DRAFT-001', supplier: 'Test Supplier', samplingMethod: 'grab',
    status: 'DRAFT', attachments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
];

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

// Mock mapping for user role (replace with actual role from useAuth if available and more structured)
const mapFirebaseUserToAppRole = (firebaseUser: any): UserRole => {
  if (!firebaseUser) return 'TECHNICIAN';
  if (firebaseUser.email?.includes('admin@example.com')) return 'ADMIN';
  if (firebaseUser.email?.includes('supervisor@example.com')) return 'SUPERVISOR';
  return 'TECHNICIAN';
};
type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';


export default function ReportsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FieldReport['status'] | 'ALL'>('ALL');
  const [materialFilter, setMaterialFilter] = useState<FieldReport['materialType'] | 'ALL'>('ALL');

  // Adjust mock data for the current technician for testing 'edit draft'
  const [reportsToDisplay, setReportsToDisplay] = useState<FieldReport[]>(mockReportsData);

  useEffect(() => {
    if (!authLoading && user) {
      const role = mapFirebaseUserToAppRole(user);
      setCurrentUserRole(role);

      const updatedMockData = mockReportsData.map(report =>
        report.id === 'RPT006' ? { ...report, technicianId: user.uid } : report
      );

      if (role === 'TECHNICIAN') {
        setReportsToDisplay(updatedMockData.filter(report => report.technicianId === user.uid));
      } else {
        setReportsToDisplay(updatedMockData); // Admins/Supervisors see all
      }
    } else if (!authLoading && !user){
      // Non-logged in users see nothing or a login prompt (handled by layout)
      setReportsToDisplay([]);
      setCurrentUserRole('TECHNICIAN'); // Default to avoid null issues if needed by UI before redirect
    }
  }, [user, authLoading]);


  const handleViewReport = (report: FieldReport) => {
    console.log("View report:", report.id);
     toast({ title: "View Report", description: `Details for report ${report.id} would be shown here.` });
  };

  const handleEditReport = (report: FieldReport) => {
    console.log("Edit report:", report.id);
    // This would typically navigate to /reports/edit/[reportId] or open a dialog
    toast({ title: "Edit Report", description: `Form to edit report ${report.id} would open.` });
  };

  const handleDeleteReport = (reportId: string) => {
    console.log("Delete report:", reportId);
    toast({ variant: "destructive", title: "Delete Report (Simulated)", description: `Report ${reportId} would be deleted.`});
     // Implement actual deletion and re-fetch/update `reportsToDisplay`
  };

  const filteredReports = useMemo(() => {
    return reportsToDisplay.filter(report => {
      const matchesSearchTerm = searchTerm === '' ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesMaterial = materialFilter === 'ALL' || report.materialType === materialFilter;
      
      // Technician specific filtering is already done in useEffect updating `reportsToDisplay`
      return matchesSearchTerm && matchesStatus && matchesMaterial;
    });
  }, [reportsToDisplay, searchTerm, statusFilter, materialFilter]);

  if (authLoading || currentUserRole === null) {
    return (
      <>
        <PageTitle title="Field Reports" icon={FileText} subtitle="Loading reports..." />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
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
          <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMaterialFilter('ALL');}} className="h-10 w-full lg:w-auto">
            <Filter className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </div>

      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <ReportTable
          reports={filteredReports}
          onViewReport={handleViewReport}
          onEditReport={handleEditReport} // Make sure this is passed
          onDeleteReport={handleDeleteReport}
          currentUserId={user?.uid} // Pass current user ID
          currentUserRole={currentUserRole}
        />
      </div>
    </>
  );
}

