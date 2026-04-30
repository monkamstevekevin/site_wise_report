import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
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
  label: { width: 130, color: '#555555', fontSize: 8 },
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
    padding: '2 3',
    borderRightWidth: 0.5,
    borderColor: '#888888',
    fontSize: 7,
    textAlign: 'center',
  },
  td: {
    padding: '2 3',
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
    marginTop: 24,
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
  matLabel: { width: 140, color: '#555555', fontSize: 8 },
  matValue: { flex: 1, fontSize: 8 },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  rows: CompactionTestRow[];
  /** testData from the first compaction report of the project — contains material specs */
  header: Partial<CompactionReportData>;
  projectName?: string;
  projectLocation?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  entrepreneur?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompactionSummaryReportPDF({
  rows,
  header,
  projectName,
  projectLocation,
  orgLogoUrl,
  orgName,
  entrepreneur,
}: Props) {
  const today = new Date().toLocaleDateString('fr-CA');
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
            <Text style={S.title}>
              {'Résumé d\u2019essais \u2014 Contrôle de compacité'}
            </Text>
            <Text style={S.subtitle}>Formulaire RC-6304</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={S.subtitle}>Date : {today}</Text>
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
            <Text style={S.value}>{entrepreneur ?? header.entrepreneur ?? '\u2013'}</Text>
          </View>
        </View>

        {/* ── Lab tests (material specs) ───────────────────── */}
        {materials.map((mat, i) => (
          <View key={i} style={S.section}>
            <Text style={S.sectionTitle}>
              {'Essais de laboratoire \u2014 Mat\u00e9riau '}{i + 1}{' : '}{mat.name}
            </Text>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Matériau :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{mat.name}</Text>
              <Text style={S.matLabel}>Provenance :</Text>
              <Text style={S.matValue}>{mat.source}</Text>
            </View>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Usage :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{header.workCategory ?? '\u2013'}</Text>
              <Text style={S.matLabel}>Méthode :</Text>
              <Text style={S.matValue}>
                {mat.densityMethod === 'proctor' ? 'Proctor' : "Planche d'essai"}
              </Text>
            </View>
            <View style={S.matRow}>
              <Text style={S.matLabel}>Masse vol. sèche max (kg/m³) :</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{mat.maxDensity}</Text>
              <Text style={S.matLabel}>Humidité optimum (%) :</Text>
              <Text style={S.matValue}>{mat.optimalMoisture}</Text>
            </View>
            <View style={S.matRow}>
              <Text style={S.matLabel}>{'% pierre \u00e0 l\u2019essai :'}</Text>
              <Text style={[S.matValue, { flex: 2 }]}>{'\u2013'}</Text>
              <Text style={S.matLabel}>Compacité exigée (%) :</Text>
              <Text style={S.matValue}>{mat.compactionReq}%</Text>
            </View>
          </View>
        ))}

        {/* ── Field tests table ────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Essais de terrain</Text>
          <View style={S.table}>
            {/* Header */}
            <View style={S.tableRow}>
              <Text style={[S.th, { flex: 2 }]}>{"Localisation de l\u2019essai"}</Text>
              <Text style={[S.th, { width: 52 }]}>Date</Text>
              <Text style={[S.th, { width: 42 }]}>Teneur eau (%)</Text>
              <Text style={[S.th, { width: 56 }]}>Masse vol. sèche (kg/m³)</Text>
              <Text style={[S.th, { width: 42 }]}>Retenu 5mm (%)</Text>
              <Text style={[S.th, { width: 56 }]}>Masse vol. corrigée (kg/m³)</Text>
              <Text style={[S.th, { width: 44 }]}>% compacité</Text>
              <Text style={[S.th, { flex: 1 }]}>Remarques</Text>
            </View>
            {/* Data rows */}
            {rows.map((row, i) => {
              const pct = row.compactionPercent != null ? Number(row.compactionPercent) : null;
              const req = row.requiredPercent != null ? Number(row.requiredPercent) : null;
              const ok = pct !== null && req !== null ? pct >= req : null;
              return (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.td, { flex: 2 }]}>{row.localisation ?? ''}</Text>
                  <Text style={[S.td, { width: 52 }]}>{row.testDate ?? ''}</Text>
                  <Text style={[S.td, { width: 42, textAlign: 'center' }]}>
                    {row.waterContent != null ? String(row.waterContent) : ''}
                  </Text>
                  <Text style={[S.td, { width: 56, textAlign: 'center' }]}>
                    {row.dryDensity != null ? String(row.dryDensity) : ''}
                  </Text>
                  <Text style={[S.td, { width: 42, textAlign: 'center' }]}>
                    {row.retained5mm != null ? String(row.retained5mm) : ''}
                  </Text>
                  <Text style={[S.td, { width: 56, textAlign: 'center' }]}>
                    {row.correctedDensity != null ? String(row.correctedDensity) : ''}
                  </Text>
                  <Text
                    style={[
                      S.td,
                      { width: 44, textAlign: 'center' },
                      ok === true ? S.compliant : ok === false ? S.nonCompliant : {},
                    ]}
                  >
                    {row.compactionPercent != null ? String(row.compactionPercent) : ''}
                  </Text>
                  <Text style={[S.td, { flex: 1 }]}>{row.remarks ?? ''}</Text>
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

        {/* ── Signatures ───────────────────────────────────── */}
        <View style={S.sigRow}>
          <View style={S.sigBox}>
            <Text>Effectué par : _______________</Text>
            <Text style={{ fontSize: 7, marginTop: 2, color: '#555555' }}>
              Initiales + Date
            </Text>
          </View>
          <View style={S.sigBox}>
            <Text>Vérifié L.E.R : _______________</Text>
            <Text style={{ fontSize: 7, marginTop: 2, color: '#555555' }}>
              Initiales + Date
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
