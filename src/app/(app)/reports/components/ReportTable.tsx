
'use client';

import React, { useState } from 'react';
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
import { Eye, Edit, Trash2, MoreVertical, FileText, CheckCircle, XCircle } from 'lucide-react';
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
import { fr } from 'date-fns/locale';
import type { UserRole } from '@/lib/constants';
import { useRouter } from 'next/navigation';

// Mock user data to map technicianId to name - in a real app, this would come from a data store or context
const mockTechnicians: Record<string, string> = {
  'USR003': 'Aisha Khan',
  'USR004': 'David Lee',
  'USR006': 'Robert Downy',
  'tech001': 'Tech Example', // Added mock technician
};

const reportStatusBadgeVariant: Record<FieldReport['status'], "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  VALIDATED: "default",
  REJECTED: "destructive",
};

const materialTypeDisplay: Record<string, string> = {
  cement: "Ciment",
  asphalt: "Asphalte",
  gravel: "Gravier",
  sand: "Sable",
  other: "Autre",
};

interface ReportTableProps {
  reports: FieldReport[];
  onEditReport?: (report: FieldReport) => void;
  onDeleteReport?: (report: FieldReport) => void;
  onValidateReport?: (report: FieldReport) => void; 
  onRejectReport?: (report: FieldReport) => void;
  currentUserId?: string;
  currentUserRole?: UserRole | null;
}

export function ReportTable({
  reports,
  onEditReport,
  onDeleteReport,
  onValidateReport,
  onRejectReport,
  currentUserId,
  currentUserRole
}: ReportTableProps) {
  const router = useRouter();

  const handleView = (report: FieldReport) => {
    router.push(`/reports/view/${report.id}`);
  };

  const handleEdit = (report: FieldReport) => {
    onEditReport?.(report);
  };

  const handleDelete = (report: FieldReport) => {
    onDeleteReport?.(report);
  };

  const handleValidate = (report: FieldReport) => {
    onValidateReport?.(report);
  };

  const handleOpenRejectionDialog = (report: FieldReport) => {
    onRejectReport?.(report);
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
            if (currentUserRole === 'TECHNICIAN' && isOwner && (report.status === 'DRAFT' || report.status === 'REJECTED')) {
              canEdit = true;
            } else if ((currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (report.status === 'DRAFT' || report.status === 'SUBMITTED')) {
              canEdit = true;
            }

            let canDelete = false;
            if (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') {
              canDelete = true; 
            } else if (currentUserRole === 'TECHNICIAN' && isOwner && report.status === 'DRAFT') {
              canDelete = true;
            }

            const canValidateOrReject = 
              (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') &&
              report.status === 'SUBMITTED';

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
                <TableCell>{format(new Date(report.createdAt), 'PP', { locale: fr })}</TableCell>
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
                         <Edit className="mr-2 h-4 w-4" /> {canEdit ? (report.status === 'REJECTED' ? "Corriger et Resoumettre" : "Modifier Rapport") : "Modifier (Verrouillé)"}
                      </DropdownMenuItem>
                      
                      {canValidateOrReject && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleValidate(report)} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                            <CheckCircle className="mr-2 h-4 w-4" /> Valider le Rapport
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenRejectionDialog(report)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                            <XCircle className="mr-2 h-4 w-4" /> Rejeter le Rapport
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(report)}
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
