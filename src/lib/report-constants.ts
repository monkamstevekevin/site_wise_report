/**
 * Constantes métier partagées pour les rapports.
 * Source unique de vérité — évite la duplication entre dashboard, reports, analytics, etc.
 */

import type { FieldReport } from '@/lib/types';

// ─── Affichage des types de matériaux ────────────────────────────────────────

export const MATERIAL_TYPE_DISPLAY: Record<string, string> = {
  cement: 'Ciment',
  asphalt: 'Asphalte',
  gravel: 'Gravier',
  sand: 'Sable',
  other: 'Autre',
};

// ─── Options de filtre matériaux ─────────────────────────────────────────────

export const MATERIAL_TYPE_FILTER_OPTIONS: { value: FieldReport['materialType'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Types de Matériaux' },
  { value: 'cement', label: 'Ciment' },
  { value: 'asphalt', label: 'Asphalte' },
  { value: 'gravel', label: 'Gravier' },
  { value: 'sand', label: 'Sable' },
  { value: 'other', label: 'Autre' },
];

// ─── Options de filtre statuts ────────────────────────────────────────────────

export const REPORT_STATUS_FILTER_OPTIONS: { value: FieldReport['status'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous les Statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SUBMITTED', label: 'Soumis' },
  { value: 'VALIDATED', label: 'Validé' },
  { value: 'REJECTED', label: 'Rejeté' },
];

// ─── Variantes de badge par statut ───────────────────────────────────────────

export const REPORT_STATUS_BADGE_VARIANT: Record<
  FieldReport['status'],
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  DRAFT: 'outline',
  SUBMITTED: 'secondary',
  VALIDATED: 'default',
  REJECTED: 'destructive',
};

// ─── Couleurs des graphiques ──────────────────────────────────────────────────

export const MATERIAL_CHART_COLORS: Record<string, string> = {
  cement: 'hsl(var(--chart-1))',
  asphalt: 'hsl(var(--chart-2))',
  gravel: 'hsl(var(--chart-3))',
  sand: 'hsl(var(--chart-4))',
  other: 'hsl(var(--chart-5))',
};

export const SUPPLIER_CHART_COLORS: string[] = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
