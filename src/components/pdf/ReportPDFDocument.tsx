import React from 'react';
import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';
import type { FieldReport } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Dictionnaires ────────────────────────────────────────────────────────────

const MATERIAL_LABELS: Record<string, string> = {
  cement: 'Ciment Portland',
  asphalt: 'Enrobé bitumineux',
  gravel: 'Granulats (gravier)',
  sand: 'Sable',
  other: 'Autre matériau',
};

const SAMPLING_LABELS: Record<string, string> = {
  grab: 'Échantillon instantané (grab)',
  composite: 'Échantillon composite',
  core: 'Carotte',
  other: 'Autre méthode',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis – En attente de validation',
  VALIDATED: 'VALIDÉ ✓',
  REJECTED: 'REJETÉ ✗',
};

const STATUS_BG: Record<string, string> = {
  DRAFT:     '#94a3b8',
  SUBMITTED: '#d97706',
  VALIDATED: '#059669',
  REJECTED:  '#dc2626',
};

const NORMS: Record<string, string> = {
  cement:  'CSA A3000 · CSA A23.1 / A23.2',
  asphalt: 'Normes MTQ – Enrobés bitumineux · LC 26-001',
  gravel:  'BNQ 2560-114 · MTQ Chaussées · CSA A23.1',
  sand:    'BNQ 2560-025 · CSA A23.1 · Module de finesse 2,2–3,1',
  other:   'Normes applicables selon le type de matériau',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    paddingTop: 48, paddingBottom: 72, paddingHorizontal: 44,
    fontFamily: 'Helvetica', fontSize: 9, color: '#111827',
    backgroundColor: '#ffffff',
  },

  /* En-tête */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingBottom: 12, marginBottom: 14,
    borderBottomWidth: 2.5, borderBottomColor: '#2563eb',
  },
  appName: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#2563eb' },
  appSub:  { fontSize: 8, color: '#6b7280', marginTop: 3 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right' },
  docNum:   { fontSize: 8, color: '#6b7280', marginTop: 3 },
  docDate:  { fontSize: 8, color: '#6b7280', marginTop: 2 },

  /* Bandeau statut */
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 5, marginBottom: 18,
  },
  statusLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  statusSub:   { fontSize: 8, color: '#ffffff', opacity: 0.85 },

  /* Sections */
  section: { marginBottom: 14 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 5, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  sectionAccent: { width: 3, height: 12, backgroundColor: '#2563eb', borderRadius: 1.5, marginRight: 7 },
  sectionTitle: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },

  /* Grille champs */
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '50%', marginBottom: 9, paddingRight: 12 },
  cellFull: { width: '100%', marginBottom: 9 },
  lbl: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  val: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111827' },
  valNormal: { fontSize: 9, color: '#374151' },

  /* Tableau mesures */
  measRow: {
    flexDirection: 'row',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden',
    marginTop: 2,
  },
  measCell: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center',
    borderRightWidth: 1, borderRightColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  measCellLast: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', backgroundColor: '#f8fafc',
  },
  measLbl:   { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  measVal:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' },
  measUnit:  { fontSize: 7.5, color: '#6b7280', marginTop: 2 },

  /* Boîte IA */
  aiOk:  { padding: 10, borderRadius: 5, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  aiErr: { padding: 10, borderRadius: 5, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fdba74' },
  aiTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', marginBottom: 5 },
  aiText:  { fontSize: 8.5, color: '#374151', lineHeight: 1.55 },

  /* Boîte rejet */
  rejBox: {
    padding: 10, borderRadius: 5, marginTop: 8,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
  },
  rejLbl: { fontSize: 7, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  rejTxt: { fontSize: 8.5, color: '#7f1d1d', lineHeight: 1.55 },

  /* Notes */
  notesBox: {
    padding: 10, borderRadius: 5,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
  },
  notesTxt: { fontSize: 8.5, color: '#374151', lineHeight: 1.55 },

  /* Pied de page */
  footer: {
    position: 'absolute', bottom: 28, left: 44, right: 44,
    paddingTop: 7, borderTopWidth: 1, borderTopColor: '#e5e7eb',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  footerLeft: { flex: 1 },
  footerNormTitle: { fontSize: 6.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  footerNormText:  { fontSize: 7, color: '#6b7280' },
  footerRight: { alignItems: 'flex-end' },
  footerApp:  { fontSize: 7, color: '#9ca3af' },
  footerPage: { fontSize: 7, color: '#9ca3af', marginTop: 2 },
});

// ─── Composants utilitaires ───────────────────────────────────────────────────

const SectionTitle = ({ title }: { title: string }) => (
  <View style={S.sectionHead}>
    <View style={S.sectionAccent} />
    <Text style={S.sectionTitle}>{title}</Text>
  </View>
);

const Field = ({ label, value, full = false }: { label: string; value?: string | number | null; full?: boolean }) => (
  <View style={full ? S.cellFull : S.cell}>
    <Text style={S.lbl}>{label}</Text>
    <Text style={S.val}>{value ?? 'N/D'}</Text>
  </View>
);

const fmt = (d: string) => {
  try { return format(new Date(d), 'dd MMMM yyyy, HH:mm', { locale: fr }); }
  catch { return d; }
};

// ─── Document principal ───────────────────────────────────────────────────────

interface ReportPDFDocumentProps {
  report: FieldReport;
  projectName?: string;
  projectLocation?: string;
  technicianName?: string;
}

export function ReportPDFDocument({
  report, projectName, projectLocation, technicianName,
}: ReportPDFDocumentProps) {
  const statusBg = STATUS_BG[report.status] ?? '#94a3b8';
  const matKey = report.materialType?.toLowerCase() ?? 'other';
  const norm = NORMS[matKey] ?? NORMS.other;

  return (
    <Document
      title={`Rapport d'essai – ${report.id.slice(0, 8).toUpperCase()}`}
      author="SiteWise Reports"
      subject="Rapport d'essai de matériaux"
      creator="SiteWise Reports"
    >
      <Page size="LETTER" style={S.page}>

        {/* ── En-tête ── */}
        <View style={S.header}>
          <View>
            <Text style={S.appName}>SiteWise</Text>
            <Text style={S.appSub}>Rapport d'essai de matériaux</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.docTitle}>RAPPORT D'ESSAI</Text>
            <Text style={S.docNum}>N° {report.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={S.docDate}>Créé le {fmt(report.createdAt)}</Text>
          </View>
        </View>

        {/* ── Bandeau statut ── */}
        <View style={[S.statusBar, { backgroundColor: statusBg }]}>
          <View>
            <Text style={S.statusLabel}>{STATUS_LABELS[report.status] ?? report.status}</Text>
            {report.status === 'VALIDATED' && (
              <Text style={S.statusSub}>Mis à jour le {fmt(report.updatedAt)}</Text>
            )}
          </View>
          <Text style={S.statusSub}>
            {MATERIAL_LABELS[matKey] ?? report.materialType}
          </Text>
        </View>

        {/* ── Section 1 : Projet ── */}
        <View style={S.section}>
          <SectionTitle title="1.  Informations sur le projet" />
          <View style={S.grid}>
            <Field label="Nom du projet" value={projectName ?? '—'} />
            <Field label="Identifiant du projet" value={report.projectId} />
            <Field label="Localisation" value={projectLocation ?? '—'} full />
          </View>
        </View>

        {/* ── Section 2 : Matériau ── */}
        <View style={S.section}>
          <SectionTitle title="2.  Caractéristiques du matériau" />
          <View style={S.grid}>
            <Field label="Type de matériau" value={MATERIAL_LABELS[matKey] ?? report.materialType} />
            <Field label="Fournisseur" value={report.supplier} />
            <Field label="Numéro de lot" value={report.batchNumber} />
            <Field label="Méthode d'échantillonnage" value={SAMPLING_LABELS[report.samplingMethod] ?? report.samplingMethod} />
            <Field label="Technicien" value={technicianName ?? report.technicianId} />
          </View>
        </View>

        {/* ── Section 3 : Mesures ── */}
        <View style={S.section}>
          <SectionTitle title="3.  Résultats d'essai" />
          <View style={S.measRow}>
            <View style={S.measCell}>
              <Text style={S.measLbl}>Température</Text>
              <Text style={S.measVal}>{report.temperature}</Text>
              <Text style={S.measUnit}>°C</Text>
            </View>
            <View style={S.measCell}>
              <Text style={S.measLbl}>Volume</Text>
              <Text style={S.measVal}>{report.volume}</Text>
              <Text style={S.measUnit}>m³</Text>
            </View>
            <View style={S.measCell}>
              <Text style={S.measLbl}>Densité</Text>
              <Text style={S.measVal}>{report.density}</Text>
              <Text style={S.measUnit}>kg/m³</Text>
            </View>
            <View style={S.measCellLast}>
              <Text style={S.measLbl}>Humidité</Text>
              <Text style={S.measVal}>{report.humidity}</Text>
              <Text style={S.measUnit}>%</Text>
            </View>
          </View>
        </View>

        {/* ── Section 4 : Analyse IA ── */}
        {(report.aiIsAnomalous !== undefined || report.aiIsAnomalous !== null) && (
          <View style={S.section}>
            <SectionTitle title="4.  Analyse par intelligence artificielle" />
            <View style={report.aiIsAnomalous ? S.aiErr : S.aiOk}>
              <Text style={[S.aiTitle, { color: report.aiIsAnomalous ? '#c2410c' : '#15803d' }]}>
                {report.aiIsAnomalous
                  ? '⚠  Anomalie détectée – Vérification recommandée'
                  : '✓  Aucune anomalie détectée – Conforme aux paramètres'}
              </Text>
              {report.aiAnomalyExplanation ? (
                <Text style={S.aiText}>{report.aiAnomalyExplanation}</Text>
              ) : (
                <Text style={S.aiText}>Analyse IA non disponible pour ce rapport.</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Section 5 : Validation ── */}
        <View style={S.section}>
          <SectionTitle title="5.  Décision de validation" />
          <View style={S.grid}>
            <Field label="Statut final" value={STATUS_LABELS[report.status]} />
            <Field label="Mis à jour le" value={fmt(report.updatedAt)} />
          </View>
          {report.status === 'REJECTED' && report.rejectionReason && (
            <View style={S.rejBox}>
              <Text style={S.rejLbl}>Raison du rejet</Text>
              <Text style={S.rejTxt}>{report.rejectionReason}</Text>
            </View>
          )}
        </View>

        {/* ── Section 6 : Notes ── */}
        {report.notes && (
          <View style={S.section}>
            <SectionTitle title="6.  Notes du technicien" />
            <View style={S.notesBox}>
              <Text style={S.notesTxt}>{report.notes}</Text>
            </View>
          </View>
        )}

        {/* ── Pied de page ── */}
        <View style={S.footer} fixed>
          <View style={S.footerLeft}>
            <Text style={S.footerNormTitle}>Normes de référence</Text>
            <Text style={S.footerNormText}>{norm}</Text>
          </View>
          <View style={S.footerRight}>
            <Text style={S.footerApp}>SiteWise Reports — Québec, Canada</Text>
            <Text style={S.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
          </View>
        </View>

      </Page>
    </Document>
  );
}
