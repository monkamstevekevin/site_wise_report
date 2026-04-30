import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { FieldReport, Project } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MATERIAL_LABELS: Record<string, string> = {
  cement: 'Ciment', asphalt: 'Asphalte', gravel: 'Gravier', sand: 'Sable', other: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'En attente', VALIDATED: 'Validé', REJECTED: 'Rejeté',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#d97706', VALIDATED: '#059669', REJECTED: '#dc2626',
};

const S = StyleSheet.create({
  page: {
    paddingTop: 48, paddingBottom: 72, paddingHorizontal: 44,
    fontFamily: 'Helvetica', fontSize: 9, color: '#111827', backgroundColor: '#ffffff',
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingBottom: 12, marginBottom: 16, borderBottomWidth: 2, borderBottomColor: '#1d4ed8',
  },
  logo: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', letterSpacing: 0.5 },
  logoSub: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { fontSize: 8, color: '#6b7280' },
  headerValue: { fontSize: 9, color: '#111827', fontFamily: 'Helvetica-Bold' },

  // Project info card
  infoCard: {
    backgroundColor: '#f8fafc', borderRadius: 6, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  infoRow: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  infoItem: { marginBottom: 4 },
  infoLabel: { fontSize: 7.5, color: '#6b7280', marginBottom: 1 },
  infoValue: { fontSize: 9, color: '#111827', fontFamily: 'Helvetica-Bold' },

  // KPI grid
  kpiGrid: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  kpiBox: {
    flex: 1, borderRadius: 6, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  kpiValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827' },
  kpiLabel: { fontSize: 7, color: '#6b7280', textAlign: 'center', marginTop: 3 },

  // Compliance bar
  complianceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
    padding: 12, backgroundColor: '#f0fdf4', borderRadius: 6,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  complianceLabel: { fontSize: 9, color: '#166534', fontFamily: 'Helvetica-Bold', width: 130 },
  barBg: { flex: 1, height: 10, backgroundColor: '#dcfce7', borderRadius: 5 },
  barFill: { height: 10, backgroundColor: '#16a34a', borderRadius: 5 },
  compliancePct: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#16a34a', width: 44, textAlign: 'right' },

  // Section
  sectionTitle: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1d4ed8',
    marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },

  // Table
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1e3a8a', borderRadius: 4,
    paddingVertical: 5, paddingHorizontal: 6, marginBottom: 2,
  },
  tableHeaderCell: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 8, color: '#374151' },

  // Status pill
  statusPill: {
    borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  statusText: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Anomaly
  anomalyDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#f97316', marginTop: 1,
  },

  // Footer
  footer: {
    position: 'absolute', bottom: 28, left: 44, right: 44,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: '#9ca3af' },

  // Page numbers
  pageNum: { fontSize: 7, color: '#9ca3af' },
});

// ─── Col widths ───────────────────────────────────────────────────────────────
const COL = { date: '13%', mat: '14%', lot: '18%', supplier: '20%', status: '16%', ai: '10%', temp: '9%' };

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  project: Project;
  reports: FieldReport[];
  orgLogoUrl?: string | null;
  orgName?: string | null;
}

export function ProjectSummaryPDFDocument({ project, reports, orgLogoUrl, orgName }: Props) {
  const total     = reports.length;
  const validated = reports.filter(r => r.status === 'VALIDATED').length;
  const rejected  = reports.filter(r => r.status === 'REJECTED').length;
  const submitted = reports.filter(r => r.status === 'SUBMITTED').length;
  const anomalies = reports.filter(r => r.aiIsAnomalous === true).length;
  const decided   = validated + rejected;
  const conformity = decided > 0 ? Math.round((validated / decided) * 100) : 0;

  const generatedAt = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatDate = (d?: string) => {
    if (!d) return 'N/D';
    try { return format(new Date(d), 'd MMM yyyy', { locale: fr }); }
    catch { return 'N/D'; }
  };

  const projectStatus = project.status === 'ACTIVE' ? 'Actif' : project.status === 'COMPLETED' ? 'Terminé' : 'Inactif';

  return (
    <Document title={`Synthèse — ${project.name}`} author="SiteWise Reports">
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            {orgLogoUrl ? (
              <Image src={orgLogoUrl} style={{ width: 80, height: 40, objectFit: 'contain' }} />
            ) : (
              <Text style={S.logo}>{orgName ?? 'SiteWise Reports'}</Text>
            )}
            <Text style={S.logoSub}>Rapport de synthèse — Contrôle qualité des matériaux</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.headerLabel}>Généré le</Text>
            <Text style={S.headerValue}>{generatedAt}</Text>
            <Text style={[S.headerLabel, { marginTop: 4 }]}>Statut du projet</Text>
            <Text style={S.headerValue}>{projectStatus}</Text>
          </View>
        </View>

        {/* ── Project info ────────────────────────────────────────────────── */}
        <View style={S.infoCard}>
          <Text style={S.infoTitle}>{project.name}</Text>
          <View style={S.infoRow}>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Localisation</Text>
              <Text style={S.infoValue}>{project.location}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Début</Text>
              <Text style={S.infoValue}>{formatDate(project.startDate)}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Fin prévue</Text>
              <Text style={S.infoValue}>{formatDate(project.endDate)}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>ID Projet</Text>
              <Text style={S.infoValue}>{project.id.substring(0, 12)}...</Text>
            </View>
          </View>
          {project.description ? (
            <Text style={[S.infoLabel, { marginTop: 8 }]}>{project.description}</Text>
          ) : null}
        </View>

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <View style={S.kpiGrid}>
          {[
            { label: 'Total rapports',     value: total,     bg: '#eff6ff' },
            { label: 'Validés',            value: validated, bg: '#f0fdf4' },
            { label: 'Rejetés',            value: rejected,  bg: '#fef2f2' },
            { label: 'En attente',         value: submitted, bg: '#fffbeb' },
            { label: 'Anomalies IA',       value: anomalies, bg: '#fff7ed' },
          ].map(({ label, value, bg }) => (
            <View key={label} style={[S.kpiBox, { backgroundColor: bg }]}>
              <Text style={S.kpiValue}>{value}</Text>
              <Text style={S.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Compliance bar ──────────────────────────────────────────────── */}
        {decided > 0 && (
          <View style={S.complianceRow}>
            <Text style={S.complianceLabel}>Taux de conformité ({decided} décidé{decided > 1 ? 's' : ''})</Text>
            <View style={S.barBg}>
              <View style={[S.barFill, { width: `${conformity}%` }]} />
            </View>
            <Text style={S.compliancePct}>{conformity}%</Text>
          </View>
        )}

        {/* ── Reports table ────────────────────────────────────────────────── */}
        <Text style={S.sectionTitle}>Détail des rapports ({total})</Text>

        {/* Table header */}
        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, { width: COL.date }]}>Date</Text>
          <Text style={[S.tableHeaderCell, { width: COL.mat }]}>Matériau</Text>
          <Text style={[S.tableHeaderCell, { width: COL.lot }]}>N° Lot</Text>
          <Text style={[S.tableHeaderCell, { width: COL.supplier }]}>Fournisseur</Text>
          <Text style={[S.tableHeaderCell, { width: COL.status }]}>Statut</Text>
          <Text style={[S.tableHeaderCell, { width: COL.temp }]}>Temp.</Text>
          <Text style={[S.tableHeaderCell, { width: COL.ai }]}>IA</Text>
        </View>

        {sortedReports.map((report, i) => (
          <View key={report.id} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]} wrap={false}>
            <Text style={[S.tableCell, { width: COL.date }]}>{formatDate(report.createdAt)}</Text>
            <Text style={[S.tableCell, { width: COL.mat }]}>{MATERIAL_LABELS[report.materialType] ?? report.materialType}</Text>
            <Text style={[S.tableCell, { width: COL.lot }]}>{report.batchNumber}</Text>
            <Text style={[S.tableCell, { width: COL.supplier }]}>{(report.supplier ?? '—').slice(0, 22)}</Text>
            <View style={[{ width: COL.status }, { justifyContent: 'center' }]}>
              <View style={[S.statusPill, { backgroundColor: STATUS_COLOR[report.status] ?? '#94a3b8' }]}>
                <Text style={S.statusText}>{STATUS_LABELS[report.status] ?? report.status}</Text>
              </View>
            </View>
            <Text style={[S.tableCell, { width: COL.temp }]}>{report.temperature}°C</Text>
            <View style={[{ width: COL.ai }, { alignItems: 'center', justifyContent: 'center' }]}>
              {report.aiIsAnomalous === true && <View style={S.anomalyDot} />}
            </View>
          </View>
        ))}

        {total === 0 && (
          <Text style={[S.tableCell, { padding: 12, color: '#9ca3af', textAlign: 'center' }]}>
            Aucun rapport pour ce projet.
          </Text>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            SiteWise Reports · {project.name} · Normes : MTQ, CSA A23.1/A23.2, BNQ 2560-114
          </Text>
          <Text style={S.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
