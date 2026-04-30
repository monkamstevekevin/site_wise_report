import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { FieldReport } from '@/lib/types';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111111',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  logo: { width: 120, height: 56, objectFit: 'contain', marginBottom: 4 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#555555', marginBottom: 1 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#e5e7eb',
    padding: '2 4',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 110, color: '#555555', fontSize: 8 },
  value: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderColor: '#cccccc',
    fontSize: 8,
    paddingBottom: 1,
  },
  table: { borderWidth: 0.5, borderColor: '#888888' },
  th: {
    backgroundColor: '#e5e7eb',
    fontWeight: 'bold',
    padding: '2 4',
    borderRightWidth: 0.5,
    borderColor: '#888888',
    fontSize: 7,
  },
  td: {
    padding: '2 4',
    borderRightWidth: 0.5,
    borderColor: '#cccccc',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#cccccc',
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  sigBox: {
    width: '45%',
    borderTopWidth: 0.5,
    borderColor: '#888888',
    paddingTop: 4,
    fontSize: 8,
  },
  compliant: { color: '#16a34a' },
  nonCompliant: { color: '#dc2626' },
  matRow: { flexDirection: 'row', marginBottom: 1 },
  matLabel: { width: 120, color: '#555555', fontSize: 8 },
  matValue: { flex: 1, fontSize: 8 },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  report: FieldReport;
  rows: CompactionTestRow[];
  projectName?: string;
  projectLocation?: string;
  technicianName?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompactionDailyReportPDF({
  report,
  rows,
  projectName,
  projectLocation,
  technicianName,
  orgLogoUrl,
  orgName,
}: Props) {
  const header = (report.testData ?? {}) as Partial<CompactionReportData>;
  const reportDate = new Date(report.createdAt).toLocaleDateString('fr-CA');
  const materials = [header.material1, header.material2].filter(Boolean) as NonNullable<
    CompactionReportData['material1']
  >[];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>
        {/* ── Document header ─────────────────────────────── */}
        <View style={S.headerRow}>
          <View style={{ flex: 0 }}>
            {orgLogoUrl ? (
              <Image src={orgLogoUrl} style={S.logo} />
            ) : (
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{orgName ?? ''}</Text>
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={S.title}>Rapport journalier — Contrôle de compacité</Text>
            <Text style={S.subtitle}>Formulaire RC-6306</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.subtitle}>Date : {reportDate}</Text>
            <Text style={S.subtitle}>
              Arrivée : {header.arrivalTime ?? '–'}{'   '}Départ : {header.departureTime ?? '–'}
            </Text>
            {header.nucleoNo ? (
              <Text style={S.subtitle}>Nucléodensimètre No : {header.nucleoNo}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Project info ─────────────────────────────────── */}
        <View style={S.section}>
          <View style={S.row}>
            <Text style={S.label}>Client :</Text>
            <Text style={S.value}>{orgName ?? ''}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Projet :</Text>
            <Text style={S.value}>{projectName ?? ''}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Localisation :</Text>
            <Text style={S.value}>{projectLocation ?? ''}</Text>
          </View>
          <View style={S.row}>
            <Text style={S.label}>Entrepreneur :</Text>
            <Text style={S.value}>{header.entrepreneur ?? '–'}</Text>
          </View>
          {header.subcontractor ? (
            <View style={S.row}>
              <Text style={S.label}>Sous-traitant :</Text>
              <Text style={S.value}>{header.subcontractor}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Materials ────────────────────────────────────── */}
        {materials.map((mat, i) => (
          <View key={i} style={S.section}>
            <Text style={S.sectionTitle}>
              Matériau {i + 1} : {mat.name}
            </Text>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Provenance :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{mat.source}</Text>
              <Text style={S.matLabel}>Méthode densité :</Text>
              <Text style={S.matValue}>
                {mat.densityMethod === 'proctor' ? 'Proctor' : "Planche d'essai"}
              </Text>
            </View>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Masse vol. max (kg/m³) :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{mat.maxDensity}</Text>
              <Text style={S.matLabel}>Teneur eau opt. (%) :</Text>
              <Text style={S.matValue}>{mat.optimalMoisture}</Text>
            </View>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Exigence compaction :</Text>
              <Text style={S.matValue}>{mat.compactionReq}%</Text>
            </View>
          </View>
        ))}

        {/* ── Work type ────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Type de travaux</Text>
          <View style={S.matRow}>
            <Text style={S.matLabel}>Type :</Text>
            <Text style={[S.matValue, { flex: 2 }]}>{header.workType ?? '–'}</Text>
            <Text style={S.matLabel}>Catégorie :</Text>
            <Text style={S.matValue}>{header.workCategory ?? '–'}</Text>
          </View>
          {(header.chainageFrom ?? header.chainageTo) ? (
            <View style={S.matRow}>
              <Text style={S.matLabel}>Chaînage de :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{header.chainageFrom ?? '–'}</Text>
              <Text style={S.matLabel}>à :</Text>
              <Text style={S.matValue}>{header.chainageTo ?? '–'}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Test results table ───────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Résultats des essais</Text>
          <View style={S.table}>
            {/* Header row */}
            <View style={S.tableRow}>
              <Text style={[S.th, { flex: 2 }]}>Localisation</Text>
              <Text style={[S.th, { width: 55 }]}>Matériau</Text>
              <Text style={[S.th, { width: 40 }]}>% exigé</Text>
              <Text style={[S.th, { width: 32 }]}>C/NC</Text>
              <Text style={[S.th, { width: 36 }]}>Prél.</Text>
              <Text style={[S.th, { flex: 2 }]}>No Éch. / Remarques</Text>
            </View>
            {/* Data rows */}
            {rows.map((row, i) => {
              const matName =
                row.materialRef === 'mat1'
                  ? (header.material1?.name ?? 'Mat. 1')
                  : (header.material2?.name ?? 'Mat. 2');
              return (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.td, { flex: 2 }]}>{row.localisation ?? ''}</Text>
                  <Text style={[S.td, { width: 55 }]}>{matName}</Text>
                  <Text style={[S.td, { width: 40 }]}>
                    {row.requiredPercent != null ? `${row.requiredPercent}%` : ''}
                  </Text>
                  <Text
                    style={[
                      S.td,
                      { width: 32 },
                      row.isCompliant === true
                        ? S.compliant
                        : row.isCompliant === false
                        ? S.nonCompliant
                        : {},
                    ]}
                  >
                    {row.isCompliant === null ? '–' : row.isCompliant ? 'C' : 'NC'}
                  </Text>
                  <Text style={[S.td, { width: 36 }]}>
                    {row.sampleTaken === null ? '–' : row.sampleTaken ? 'O' : 'N'}
                  </Text>
                  <Text style={[S.td, { flex: 2 }]}>
                    {[row.sampleNo, row.remarks].filter(Boolean).join(' | ')}
                  </Text>
                </View>
              );
            })}
            {rows.length === 0 && (
              <View style={S.tableRow}>
                <Text style={[S.td, { flex: 1 }]}>Aucun essai enregistré</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Notes ──────────────────────────────────────── */}
        {report.notes ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 8 }}>{report.notes}</Text>
          </View>
        ) : null}

        {/* ── Signatures ───────────────────────────────────── */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>Effectué par : {technicianName ?? '–'}</Text>
          </View>
          <View style={S.sigBox}>
            <Text>Vérifié L.E.R : _______________ / _______________</Text>
            <Text style={{ fontSize: 7, marginTop: 2, color: '#555555' }}>
              Initiales + Date
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
