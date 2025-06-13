
'use client';

import React, { useState, useMemo } from 'react';
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

// Moved mockReports here
const mockReportsData: FieldReport[] = [
  {
    id: 'RPT001',
    projectId: 'PJT001',
    technicianId: 'USR003',
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
    technicianId: 'USR004',
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
    technicianId: 'USR003',
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
    technicianId: 'USR006',
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
    technicianId: 'USR003',
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


export default function ReportsPage() {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FieldReport['status'] | 'ALL'>('ALL');
  const [materialFilter, setMaterialFilter] = useState<FieldReport['materialType'] | 'ALL'>('ALL');


  const handleViewReport = (report: FieldReport) => {
    console.log("View report:", report.id);
  };

  const handleEditReport = (report: FieldReport) => {
    console.log("Edit report:", report.id);
  };

  const handleDeleteReport = (reportId: string) => {
    console.log("Delete report:", reportId);
    toast({ variant: "destructive", title: "Delete Report", description: `Report ${reportId} would be deleted. (Not implemented)`});
     // Implement actual deletion and re-fetch/update `mockReportsData`
  };

  const filteredReports = useMemo(() => {
    return mockReportsData.filter(report => {
      const matchesSearchTerm = searchTerm === '' ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
      const matchesMaterial = materialFilter === 'ALL' || report.materialType === materialFilter;
      return matchesSearchTerm && matchesStatus && matchesMaterial;
    });
  }, [searchTerm, statusFilter, materialFilter]);

  return (
    <>
      <PageTitle
        title="Field Reports"
        icon={FileText}
        subtitle="Manage and review all submitted field reports."
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
        />
      </div>
    </>
  );
}
