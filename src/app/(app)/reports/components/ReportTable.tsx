
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
import type { UserRole } from '@/lib/constants';

// Mock user data to map technicianId to name - in a real app, this would come from a data store or context
const mockTechnicians: Record<string, string> = {
  'USR003': 'Aisha Khan',
  'USR004': 'David Lee',
  'USR006': 'Robert Downy',
  // Add more mappings if new technician IDs are used in mockReportsData
  // For dynamic user IDs from Firebase Auth, this map would need to be populated from your user data source
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
};

const materialTypeDisplay: Record<string, string> = { // Allow any string for materialType
  cement: "Cement",
  asphalt: "Asphalt",
  gravel: "Gravel",
  sand: "Sand",
  other: "Other",
};

interface ReportTableProps {
  reports: FieldReport[];
  onViewReport?: (report: FieldReport) => void;
  onEditReport?: (report: FieldReport) => void;
  onDeleteReport?: (report: FieldReport) => void; // Changed to pass full report object
  currentUserId?: string; // For technician-specific actions
  currentUserRole?: UserRole | null;
}

export function ReportTable({ reports, onViewReport, onEditReport, onDeleteReport, currentUserId, currentUserRole }: ReportTableProps) {

  const handleView = (report: FieldReport) => {
    onViewReport?.(report);
  };

  const handleEdit = (report: FieldReport) => {
    onEditReport?.(report);
  };

  const handleDelete = (report: FieldReport) => { // Now expects full report
    onDeleteReport?.(report);
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow-md">
        <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2 text-foreground">Aucun Rapport Trouvé</h3>
        <p className="text-muted-foreground">
          {currentUserRole === 'TECHNICIAN' ? "Vous n'avez encore créé aucun rapport, ou aucun ne correspond aux filtres actuels." : "Aucun rapport ne correspond aux filtres actuels. Essayez d'ajuster votre recherche."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableCaption>
          { currentUserRole === 'TECHNICIAN' ? `Une liste de vos ${reports.length} rapport(s) de terrain.` : `Une liste de ${reports.length} rapports de terrain.`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">ID Rapport</TableHead>
            <TableHead>ID Projet</TableHead>
            <TableHead>Technicien</TableHead>
            <TableHead>Matériau</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const isOwner = report.technicianId === currentUserId;
            
            let canEdit = false;
            if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') {
              if (report.status === 'DRAFT' || report.status === 'SUBMITTED') {
                canEdit = true;
              }
            } else if (currentUserRole === 'TECHNICIAN' && isOwner && report.status === 'DRAFT') {
              canEdit = true;
            }

            let canDelete = false;
            if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') {
              // Admins/Supervisors can delete any report for now. Could be restricted by status too.
              canDelete = true; 
            } else if (currentUserRole === 'TECHNICIAN' && isOwner && report.status === 'DRAFT') {
              canDelete = true;
            }


            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium text-xs">{report.id}</TableCell>
                <TableCell className="text-xs">{report.projectId}</TableCell>
                <TableCell>{mockTechnicians[report.technicianId] || report.technicianId.substring(0,10)+'...'}</TableCell>
                <TableCell>{materialTypeDisplay[report.materialType] || report.materialType}</TableCell>
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
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleView(report)}>
                        <Eye className="mr-2 h-4 w-4" /> Voir Détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(report)} disabled={!canEdit}>
                         <Edit className="mr-2 h-4 w-4" /> {canEdit ? "Modifier Rapport" : "Modifier (Verrouillé)"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(report)} // Pass full report object
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        disabled={!canDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> {canDelete ? "Supprimer" : "Supprimer (Verrouillé)"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
