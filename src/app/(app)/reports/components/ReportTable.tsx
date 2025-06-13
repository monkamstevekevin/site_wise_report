
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, MoreVertical, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { FieldReport } from '@/lib/types';
import { format } from 'date-fns';

const mockReports: FieldReport[] = [
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
    humidity: 30, // Lower for asphalt typically
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
    technicianId: 'USR003',
    materialType: 'other',
    temperature: 20,
    volume: 5,
    density: 1200, // Example density
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

// Mock user data to map technicianId to name - in a real app, this would come from a data store or context
const mockTechnicians: Record<string, string> = {
  'USR003': 'Aisha Khan',
  'USR004': 'David Lee',
  'USR006': 'Robert Downy',
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default", // Will use primary color
  REJECTED: "destructive",
};

const materialTypeDisplay: Record<FieldReport['materialType'], string> = {
  cement: "Cement",
  asphalt: "Asphalt",
  gravel: "Gravel",
  sand: "Sand",
  other: "Other",
};

interface ReportTableProps {
  onViewReport?: (report: FieldReport) => void;
  onEditReport?: (report: FieldReport) => void;
  onDeleteReport?: (reportId: string) => void;
}

export function ReportTable({ onViewReport, onEditReport, onDeleteReport }: ReportTableProps) {
  const [reports, setReports] = React.useState<FieldReport[]>(mockReports);

  const handleView = (report: FieldReport) => {
    console.log('Viewing report:', report);
    // Implement actual view logic, e.g., open a dialog or navigate to a detail page
    alert(`Viewing Report ID: ${report.id}\nStatus: ${report.status}\n(Details view not yet implemented)`);
    onViewReport?.(report);
  };

  const handleEdit = (report: FieldReport) => {
    console.log('Editing report:', report);
    alert(`Editing Report ID: ${report.id}\n(Edit form not yet implemented)`);
    onEditReport?.(report);
  };

  const handleDelete = (reportId: string) => {
    console.log('Deleting report ID:', reportId);
    alert(`Deleting Report ID: ${reportId}\n(Deletion not yet implemented)`);
    onDeleteReport?.(reportId);
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow-md">
        <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2 text-foreground">No Reports Found</h3>
        <p className="text-muted-foreground">There are currently no field reports to display.</p>
        {/* Optionally, add a button to create a new report here if appropriate for the context */}
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Report ID</TableHead>
            <TableHead>Project ID</TableHead>
            <TableHead>Technician</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium text-xs">{report.id}</TableCell>
              <TableCell className="text-xs">{report.projectId}</TableCell>
              <TableCell>{mockTechnicians[report.technicianId] || report.technicianId}</TableCell>
              <TableCell>{materialTypeDisplay[report.materialType]}</TableCell>
              <TableCell>
                <Badge variant={reportStatusBadgeVariant[report.status] || 'outline'}>
                  {report.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(report.createdAt), 'PP')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleView(report)}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(report)} disabled>
                       <Edit className="mr-2 h-4 w-4" /> Edit (Soon)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(report.id)} 
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      disabled
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete (Soon)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {reports.length > 10 && <TableCaption>A list of {reports.length} field reports.</TableCaption>}
    </div>
  );
}
