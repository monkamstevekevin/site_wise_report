'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CompactionDailyReportPDF } from '@/components/pdf/CompactionDailyReportPDF';
import { CompactionSummaryReportPDF } from '@/components/pdf/CompactionSummaryReportPDF';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOrgLogoDataUri } from '@/lib/fetchOrgLogoDataUri';
import type { FieldReport } from '@/lib/types';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

// ─── Données démo ─────────────────────────────────────────────────────────────

const DEMO_HEADER: Partial<CompactionReportData> = {
  arrivalTime: '07:15',
  departureTime: '16:30',
  nucleoNo: 'ND-4521',
  entrepreneur: 'Construction Excavation Pro Inc.',
  subcontractor: 'Pavage Beauregard Ltée',
  workType: 'ROUTE',
  workCategory: 'Fondation de chaussée – Couche de base',
  chainageFrom: '45+200',
  chainageTo: '46+500',
  material1: {
    name: 'MG-20 Gravier concassé',
    source: 'Carrière Lac-Mégantic',
    densityMethod: 'proctor',
    maxDensity: 2185,
    optimalMoisture: 7.2,
    compactionReq: 95,
  },
  material2: {
    name: 'GB-0/14 Sable fin',
    source: 'Carrière Sainte-Julie',
    densityMethod: 'proctor',
    maxDensity: 2050,
    optimalMoisture: 8.5,
    compactionReq: 98,
  },
};

const DEMO_REPORT: FieldReport = {
  id: 'demo-rc6306-2026',
  projectId: 'demo-project',
  technicianId: 'demo-tech',
  materialType: 'compaction',
  temperature: 18,
  volume: 1,
  density: 1,
  humidity: 0,
  batchNumber: 'N/A',
  supplier: 'N/A',
  samplingMethod: 'core',
  notes: 'Conditions météorologiques favorables. Compacteur Dynapac CA250D utilisé. Surface préparée selon devis MTQ-2024.',
  status: 'VALIDATED',
  attachments: [],
  createdAt: '2026-05-01T07:15:00Z',
  updatedAt: '2026-05-01T16:30:00Z',
  testData: DEMO_HEADER,
};

const makeRow = (
  id: string,
  localisation: string,
  testDate: string,
  waterContent: string,
  dryDensity: string,
  retained5mm: string,
  correctedDensity: string,
  compactionPercent: string,
  requiredPercent: string,
  materialRef: string,
  isCompliant: boolean,
  sampleTaken: boolean,
  sampleNo: string | null,
  remarks: string | null
): CompactionTestRow => ({
  id,
  reportId: 'demo-rc6306-2026',
  projectId: 'demo-project',
  organizationId: 'demo-org',
  rowOrder: '0',
  localisation,
  testDate,
  waterContent,
  dryDensity,
  retained5mm,
  correctedDensity,
  compactionPercent,
  requiredPercent,
  materialRef,
  isCompliant,
  sampleTaken,
  sampleNo,
  remarks,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Lignes RC-6306 (journalier — qualitatif)
const DAILY_ROWS: CompactionTestRow[] = [
  makeRow('r1', 'Ch. 45+250, côté Nord', '2026-05-01', '6.8', '2092', '12', '2104', '96.2', '95', 'mat1', true,  false, null,              ''),
  makeRow('r2', 'Ch. 45+450, côté Sud',  '2026-05-01', '7.1', '2078', '14', '2090', '95.6', '95', 'mat1', true,  false, null,              ''),
  makeRow('r3', 'Ch. 45+650, centre',    '2026-05-01', '5.9', '2042', '10', '2048', '93.7', '95', 'mat1', false, true,  'ÉCH-2026-042',   'Retravaillé et recompacté'),
  makeRow('r4', 'Ch. 45+650, centre (R)','2026-05-01', '7.0', '2096', '10', '2103', '96.0', '95', 'mat1', true,  false, null,              'Conforme après reprise'),
  makeRow('r5', 'Ch. 45+850, côté Nord', '2026-05-01', '6.5', '2088', '11', '2099', '96.0', '95', 'mat1', true,  false, null,              ''),
  makeRow('r6', 'Ch. 46+100, centre',    '2026-05-01', '8.2', '2012', '8',  '2018', '98.4', '98', 'mat2', true,  false, null,              ''),
  makeRow('r7', 'Ch. 46+300, côté Sud',  '2026-05-01', '8.6', '2001', '7',  '2008', '97.9', '98', 'mat2', false, true,  'ÉCH-2026-043',   'Légèrement sous 98% – prélevé'),
  makeRow('r8', 'Ch. 46+500, côté Nord', '2026-05-01', '8.4', '2022', '9',  '2029', '99.0', '98', 'mat2', true,  false, null,              ''),
];

// Lignes RC-6304 (résumé — quantitatif, plusieurs journées)
const SUMMARY_ROWS: CompactionTestRow[] = [
  makeRow('s1',  'Ch. 45+250, Nord',       '2026-04-28', '6.8', '2092', '12', '2104', '96.2', '95', 'mat1', true,  false, null,            ''),
  makeRow('s2',  'Ch. 45+450, Sud',        '2026-04-28', '7.1', '2078', '14', '2090', '95.6', '95', 'mat1', true,  false, null,            ''),
  makeRow('s3',  'Ch. 45+650, Centre',     '2026-04-29', '5.9', '2042', '10', '2048', '93.7', '95', 'mat1', false, true,  'ÉCH-2026-042', 'NC – Retravaillé'),
  makeRow('s4',  'Ch. 45+650, Centre (R)', '2026-04-29', '7.0', '2096', '10', '2103', '96.0', '95', 'mat1', true,  false, null,            'Conforme après reprise'),
  makeRow('s5',  'Ch. 45+850, Nord',       '2026-04-29', '6.5', '2088', '11', '2099', '96.0', '95', 'mat1', true,  false, null,            ''),
  makeRow('s6',  'Ch. 46+050, Sud',        '2026-04-30', '7.3', '2097', '9',  '2106', '96.4', '95', 'mat1', true,  false, null,            ''),
  makeRow('s7',  'Ch. 46+250, Centre',     '2026-04-30', '6.9', '2084', '13', '2095', '95.9', '95', 'mat1', true,  false, null,            ''),
  makeRow('s8',  'Ch. 46+100, Centre',     '2026-04-30', '8.2', '2012', '8',  '2018', '98.4', '98', 'mat2', true,  false, null,            ''),
  makeRow('s9',  'Ch. 46+300, Sud',        '2026-05-01', '8.6', '2001', '7',  '2008', '97.9', '98', 'mat2', false, true,  'ÉCH-2026-043', 'Légèrement sous 98%'),
  makeRow('s10', 'Ch. 46+500, Nord',       '2026-05-01', '8.4', '2022', '9',  '2029', '99.0', '98', 'mat2', true,  false, null,            ''),
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPDFPage() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!user?.organizationId) { setLogoReady(true); return; }
    fetchOrgLogoDataUri()
      .then((uri) => { if (uri) setOrgLogoUrl(uri); })
      .finally(() => setLogoReady(true));
  }, [user?.organizationId]);

  const orgName = user?.organizationName ?? 'Laboratoires d\'Expertise Routière Inc.';

  const disabled = !isClient || !logoReady;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Formulaires de démonstration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Téléchargez les rapports pré-remplis pour présentation client.
        </p>
      </div>

      {/* Projet démo */}
      <Card className="border-blue-100 bg-blue-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-blue-800">Projet de démonstration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-0.5">
          <p><span className="font-medium">Projet :</span> Réfection Route 132 – Secteur St-Nicolas</p>
          <p><span className="font-medium">Localisation :</span> Route 132, km 45+200 à 46+500, Lévis, Québec</p>
          <p><span className="font-medium">Entrepreneur :</span> Construction Excavation Pro Inc.</p>
          <p><span className="font-medium">Matériaux :</span> MG-20 (95%) + GB-0/14 (98%)</p>
        </CardContent>
      </Card>

      {/* RC-6306 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            RC-6306 — Rapport journalier de compacité
          </CardTitle>
          <CardDescription>
            8 essais de terrain · 1 journée (2026-05-01) · 1 non-conforme repris
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disabled ? (
            <Button disabled variant="outline">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Préparation...
            </Button>
          ) : (
            <PDFDownloadLink
              document={
                <CompactionDailyReportPDF
                  report={DEMO_REPORT}
                  rows={DAILY_ROWS}
                  projectName="Réfection Route 132 – Secteur St-Nicolas"
                  projectLocation="Route 132, km 45+200 à 46+500, Lévis, Québec"
                  technicianName="Jean-François Tremblay, T.P."
                  orgLogoUrl={orgLogoUrl}
                  orgName={orgName}
                />
              }
              fileName="DEMO-RC-6306-Route132.pdf"
            >
              {({ loading }) => (
                <Button variant="default" disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération...</>
                    : <><Download className="h-4 w-4 mr-2" /> Télécharger RC-6306</>
                  }
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </CardContent>
      </Card>

      {/* RC-6304 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            RC-6304 — Résumé d&apos;essais de compacité
          </CardTitle>
          <CardDescription>
            10 essais · 4 journées (28 avr – 1 mai 2026) · 2 non-conformes dont 1 repris
          </CardDescription>
        </CardHeader>
        <CardContent>
          {disabled ? (
            <Button disabled variant="outline">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Préparation...
            </Button>
          ) : (
            <PDFDownloadLink
              document={
                <CompactionSummaryReportPDF
                  rows={SUMMARY_ROWS}
                  header={DEMO_HEADER}
                  projectName="Réfection Route 132 – Secteur St-Nicolas"
                  projectLocation="Route 132, km 45+200 à 46+500, Lévis, Québec"
                  entrepreneur="Construction Excavation Pro Inc."
                  orgLogoUrl={orgLogoUrl}
                  orgName={orgName}
                />
              }
              fileName="DEMO-RC-6304-Route132.pdf"
            >
              {({ loading }) => (
                <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération...</>
                    : <><Download className="h-4 w-4 mr-2" /> Télécharger RC-6304</>
                  }
                </Button>
              )}
            </PDFDownloadLink>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
