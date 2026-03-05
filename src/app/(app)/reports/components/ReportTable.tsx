'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Eye, Edit, Trash2, MoreVertical, FileText,
  CheckCircle, XCircle, AlertTriangle, Sparkles,
  CalendarDays, TestTube2, Tag, Building2, Package,
} from 'lucide-react';
import { DownloadReportButton } from '@/components/pdf/DownloadReportButton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FieldReport } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { UserRole } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  DRAFT:     { label: 'Brouillon', bar: 'bg-slate-400',   pill: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' },
  SUBMITTED: { label: 'Soumis',    bar: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800' },
  VALIDATED: { label: 'Validé',    bar: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800' },
  REJECTED:  { label: 'Rejeté',    bar: 'bg-rose-500',    pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800' },
} as const;

const MATERIAL_CONFIG: Record<string, { label: string; color: string }> = {
  cement:  { label: 'Ciment',    color: 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:ring-stone-700' },
  asphalt: { label: 'Asphalte',  color: 'bg-zinc-800 text-zinc-100 ring-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-600' },
  gravel:  { label: 'Gravier',   color: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800' },
  sand:    { label: 'Sable',     color: 'bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:ring-yellow-800' },
  other:   { label: 'Autre',     color: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-800' },
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
  reports, onEditReport, onDeleteReport,
  onValidateReport, onRejectReport,
  currentUserId, currentUserRole,
}: ReportTableProps) {
  const router = useRouter();

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-card rounded-xl border border-border/60">
        <div className="rounded-full bg-muted p-4">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-semibold text-foreground">Aucun rapport trouvé</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {currentUserRole === 'TECHNICIAN'
            ? "Vous n'avez encore créé aucun rapport, ou aucun ne correspond aux filtres."
            : "Aucun rapport ne correspond aux filtres actuels."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map(report => {
        const statusCfg = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.DRAFT;
        const matCfg = MATERIAL_CONFIG[report.materialType] ?? MATERIAL_CONFIG.other;

        const isOwner = report.technicianId === currentUserId;
        const canEdit =
          (currentUserRole === 'TECHNICIAN' && isOwner && (report.status === 'DRAFT' || report.status === 'REJECTED')) ||
          ((currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && (report.status === 'DRAFT' || report.status === 'SUBMITTED'));
        const canDelete =
          currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' ||
          (currentUserRole === 'TECHNICIAN' && isOwner && report.status === 'DRAFT');
        const canValidateOrReject =
          (currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR') && report.status === 'SUBMITTED';

        return (
          <div
            key={report.id}
            className="group relative rounded-xl border border-border/70 bg-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            {/* Color accent bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-1', statusCfg.bar)} />

            <div className="pl-5 pr-4 py-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">

                  {/* Top row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status */}
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1',
                        statusCfg.pill
                      )}>
                        {statusCfg.label}
                      </span>
                      {/* Material */}
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                        matCfg.color
                      )}>
                        <TestTube2 className="h-3 w-3" />
                        {matCfg.label}
                      </span>
                      {/* AI anomaly */}
                      {report.aiIsAnomalous === true && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:ring-orange-800">
                          <AlertTriangle className="h-3 w-3" /> Anomalie IA
                        </span>
                      )}
                      {report.aiIsAnomalous === false && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800">
                          <Sparkles className="h-3 w-3" /> IA OK
                        </span>
                      )}
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/reports/view/${report.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> Voir les détails
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                          <div className="w-full">
                            <DownloadReportButton
                              report={report}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start px-0 h-auto font-normal text-sm"
                            />
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditReport?.(report)} disabled={!canEdit}>
                          <Edit className="mr-2 h-4 w-4" />
                          {report.status === 'REJECTED' ? 'Corriger et resoumettre' : 'Modifier'}
                        </DropdownMenuItem>
                        {canValidateOrReject && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onValidateReport?.(report)} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                              <CheckCircle className="mr-2 h-4 w-4" /> Valider
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onRejectReport?.(report)} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50">
                              <XCircle className="mr-2 h-4 w-4" /> Rejeter
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteReport?.(report)}
                          disabled={!canDelete}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span className="font-mono">{report.batchNumber}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {report.supplier}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span className="font-mono text-[11px] text-muted-foreground/70">{report.projectId.slice(0, 8)}…</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(report.createdAt), 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>

                  {/* Measurements row */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: 'Temp.', value: `${report.temperature}°C` },
                      { label: 'Vol.', value: `${report.volume} m³` },
                      { label: 'Dens.', value: `${report.density} kg/m³` },
                      { label: 'Hum.', value: `${report.humidity}%` },
                    ].map(m => (
                      <span key={m.label} className="inline-flex items-center gap-1 text-xs bg-muted/60 px-2 py-0.5 rounded-md">
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-medium text-foreground">{m.value}</span>
                      </span>
                    ))}
                  </div>

                  {/* Rejection reason */}
                  {report.status === 'REJECTED' && report.rejectionReason && (
                    <div className="flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-lg px-3 py-2">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{report.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
