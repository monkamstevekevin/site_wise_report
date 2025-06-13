
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

// Mock user data to map technicianId to name - in a real app, this would come from a data store or context
const mockTechnicians: Record<string, string> = {
  'USR003': 'Aisha Khan',
  'USR004': 'David Lee',
  'USR006': 'Robert Downy',
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
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
  reports: FieldReport[]; // Accept reports as a prop
  onViewReport?: (report: FieldReport) => void;
  onEditReport?: (report: FieldReport) => void;
  onDeleteReport?: (reportId: string) => void;
}

export function ReportTable({ reports, onViewReport, onEditReport, onDeleteReport }: ReportTableProps) {

  const handleView = (report: FieldReport) => {
    alert(`Viewing Report ID: ${report.id}\nStatus: ${report.status}\n(Details view not yet implemented)`);
    onViewReport?.(report);
  };

  const handleEdit = (report: FieldReport) => {
    alert(`Editing Report ID: ${report.id}\n(Edit form not yet implemented)`);
    onEditReport?.(report);
  };

  const handleDelete = (reportId: string) => {
    alert(`Deleting Report ID: ${reportId}\n(Deletion not yet implemented)`);
    onDeleteReport?.(reportId);
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow-md">
        <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2 text-foreground">No Reports Found</h3>
        <p className="text-muted-foreground">No reports match the current filters. Try adjusting your search.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        {reports.length > 10 && <TableCaption>A list of {reports.length} field reports.</TableCaption>}
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
    </div>
  );
}
