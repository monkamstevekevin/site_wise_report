'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPDFDocument } from './ReportPDFDocument';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { FieldReport } from '@/lib/types';
import type { TestType } from '@/db/schema';
import { CompactionDailyReportPDF } from './CompactionDailyReportPDF';
import type { CompactionTestRow } from '@/db/schema';

interface DownloadReportButtonProps {
  report: FieldReport;
  projectName?: string;
  projectLocation?: string;
  technicianName?: string;
  testType?: TestType | null;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadReportButton({
  report,
  projectName,
  projectLocation,
  technicianName,
  testType,
  orgLogoUrl,
  orgName,
  variant = 'outline',
  size = 'sm',
  className,
}: DownloadReportButtonProps) {
  // PDFDownloadLink is client-only — avoid SSR hydration mismatch
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [compactionRows, setCompactionRows] = useState<CompactionTestRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);

  useEffect(() => {
    if (!isClient || (report.materialType as string) !== 'compaction') {
      setRowsLoaded(true);
      return;
    }
    fetch(`/api/compaction-rows?reportId=${report.id}`)
      .then((r) => r.json())
      .then((data: CompactionTestRow[]) => {
        setCompactionRows(data);
        setRowsLoaded(true);
      })
      .catch(() => setRowsLoaded(true));
  }, [isClient, report.id, report.materialType]);

  const fileName = `rapport-${report.id.slice(0, 8).toUpperCase()}-${report.materialType}.pdf`;

  if ((report.materialType as string) === 'compaction') {
    if (!isClient || !rowsLoaded) {
      return (
        <Button variant={variant} size={size} className={className} disabled>
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> RC-6306
        </Button>
      );
    }
    return (
      <PDFDownloadLink
        document={
          <CompactionDailyReportPDF
            report={report}
            rows={compactionRows}
            projectName={projectName}
            projectLocation={projectLocation}
            technicianName={technicianName}
            orgLogoUrl={orgLogoUrl}
            orgName={orgName}
          />
        }
        fileName={`RC-6306-${report.id.slice(0, 8).toUpperCase()}.pdf`}
      >
        {({ loading }) => (
          <Button variant={variant} size={size} className={className} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" /> RC-6306
              </>
            )}
          </Button>
        )}
      </PDFDownloadLink>
    );
  }

  if (!isClient || !rowsLoaded) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Download className="h-4 w-4 mr-1.5" /> PDF
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <ReportPDFDocument
          report={report}
          projectName={projectName}
          projectLocation={projectLocation}
          technicianName={technicianName}
          testType={testType}
          orgLogoUrl={orgLogoUrl}
          orgName={orgName}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant={variant} size={size} className={className} disabled={loading}>
          {loading
            ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...</>
            : <><Download className="h-4 w-4 mr-1.5" /> PDF</>
          }
        </Button>
      )}
    </PDFDownloadLink>
  );
}
