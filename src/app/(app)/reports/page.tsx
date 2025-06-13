
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
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRole } from '@/lib/constants';
import { MOCK_TECHNICIAN_EMAIL, MOCK_TECHNICIAN_REPORTS_ID } from '@/lib/constants';

export const mockReportsData: FieldReport[] = [
  {
    id: 'RPT001',
    projectId: 'PJT001',
    technicianId: MOCK_TECHNICIAN_REPORTS_ID, // Aisha Khan -> Now our mock tech
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
    technicianId: 'USR004', // David Lee - Stays as another tech
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
    technicianId: MOCK_TECHNICIAN_REPORTS_ID, // Aisha Khan -> Now our mock tech
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
    technicianId: MOCK_TECHNICIAN_REPORTS_ID, // Robert Downy -> Now our mock tech
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
    technicianId: MOCK_TECHNICIAN_REPORTS_ID, // Aisha Khan -> Now our mock tech
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
  { 
    id: 'RPT006',
    projectId: 'PJT001',
    technicianId: MOCK_TECHNICIAN_REPORTS_ID, 
    materialType: 'cement',
    temperature: 20, volume: 10, density: 1450, humidity: 70,
    batchNumber: 'DRAFT-001', supplier: 'Test Supplier', samplingMethod: 'grab',
    status: 'DRAFT', attachments: [],
    notes: "This is a draft report for testing.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
   {
    id: 'RPT007',
    projectId: 'PJT005',
    technicianId: MOCK_TECHNICIAN_REPORTS_ID,
    materialType: 'asphalt',
    temperature: 145.5,
    volume: 22.0,
    density: 2350,
    humidity: 35,
    batchNumber: 'ASP-TECH-007',
    supplier: 'BuildIt Co.',
    samplingMethod: 'core',
    notes: 'Core sample from new highway section. Looks good.',
    status: 'VALIDATED',
    attachments: [],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'RPT008',
    projectId: 'PJT002',
    technicianId: MOCK_TECHNICIAN_REPORTS_ID,
    materialType: 'sand',
    temperature: 28,
    volume: 12.0,
    density: 1680,
    humidity: 42,
    batchNumber: 'SAND-TECH-008',
    supplier: 'Quality Aggregates',
    samplingMethod: 'grab',
    notes: 'Sand sample for concrete mix. Submitted for review.',
    status: 'SUBMITTED',
    attachments: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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

interface MappedUserRole {
  role: UserRole;
  effectiveTechnicianId: string | null;
}

const mapFirebaseUserToAppRoleAndId = (firebaseUser: any): MappedUserRole => {
  if (!firebaseUser) return { role: 'TECHNICIAN', effectiveTechnicianId: null };
  
  if (firebaseUser.email === MOCK_TECHNICIAN_EMAIL) {
    return { role: 'TECHNICIAN', effectiveTechnicianId: MOCK_TECHNICIAN_REPORTS_ID };
  }
  if (firebaseUser.email?.includes('admin@example.com')) return { role: 'ADMIN', effectiveTechnicianId: null };
  if (firebaseUser.email?.includes('supervisor@example.com')) return { role: 'SUPERVISOR', effectiveTechnicianId: null };
  
  // Default for other authenticated users, could be their firebaseUser.uid if we adapt mock data further
  return { role: 'TECHNICIAN', effectiveTechnicianId: firebaseUser.uid }; 
};


export default function ReportsPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [effectiveTechnicianId, setEffectiveTechnicianId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FieldReport['status'] | 'ALL'>('ALL');
  const [materialFilter, setMaterialFilter] = useState<FieldReport['materialType'] | 'ALL'>('ALL');

  const [reportsToDisplay, setReportsToDisplay] = useState<FieldReport[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      const { role, effectiveTechnicianId: mappedTechId } = mapFirebaseUserToAppRoleAndId(user);
      setCurrentUserRole(role);
      setEffectiveTechnicianId(mappedTechId);

      if (role === 'TECHNICIAN' && mappedTechId) {
        setReportsToDisplay(mockReportsData.filter(report => report.technicianId === mappedTechId));
      } else if (role === 'ADMIN' || role === 'SUPERVISOR') {
        setReportsToDisplay(mockReportsData); 
      } else {
         setReportsToDisplay([]); // Default to empty if no specific role or ID match
      }

    } else if (!authLoading && !user){
      setReportsToDisplay([]);
      setCurrentUserRole(null); 
      setEffectiveTechnicianId(null);
    }
  }, [user, authLoading]);


  const handleViewReport = (report: FieldReport) => {
    console.log("View report:", report.id);
     toast({ title: "View Report", description: `Details for report ${report.id} would be shown here.` });
  };

  const handleEditReport = (report: FieldReport) => {
    console.log("Edit report:", report.id);
    toast({ title: "Edit Report", description: `Form to edit report ${report.id} would open.` });
  };

  const handleDeleteReport = (reportId: string) => {
    console.log("Delete report:", reportId);
    // Simulate deletion from the currently displayed list
    setReportsToDisplay(prevReports => prevReports.filter(r => r.id !== reportId));
    // Also update mockReportsData if you want deletion to persist across navigations (for mock purposes)
    // const indexInMock = mockReportsData.findIndex(r => r.id === reportId);
    // if (indexInMock > -1) mockReportsData.splice(indexInMock, 1);

    toast({ variant: "destructive", title: "Delete Report (Simulated)", description: `Report ${reportId} would be deleted.`});
  };

  const filteredReports = useMemo(() => {
    return reportsToDisplay.filter(report => {
      const matchesSearchTerm = searchTerm === '' ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.supplier && report.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        report.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesMaterial = materialFilter === 'ALL' || report.materialType === materialFilter;
      
      return matchesSearchTerm && matchesStatus && matchesMaterial;
    });
  }, [reportsToDisplay, searchTerm, statusFilter, materialFilter]);

  if (authLoading || currentUserRole === null && user) { // Show loading if auth is loading OR if user exists but role not yet determined
    return (
      <>
        <PageTitle title="Field Reports" icon={FileText} subtitle="Loading reports..." />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }
  
  if (!user && !authLoading) {
     return (
      <>
        <PageTitle title="Field Reports" icon={FileText} subtitle="Please log in to view reports." />
         <div className="text-center py-10">
            <p className="text-muted-foreground">You need to be logged in to access this page.</p>
            <Button asChild className="mt-4">
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
          <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setMaterialFilter('ALL');}} className="h-10 w-full lg:w-auto">
            <Filter className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      </div>

      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <ReportTable
          reports={filteredReports}
          onViewReport={handleViewReport}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
          currentUserId={user?.uid} 
          currentUserRole={currentUserRole}
        />
      </div>
    </>
  );
}
