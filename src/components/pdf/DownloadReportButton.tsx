'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPDFDocument } from './ReportPDFDocument';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { FieldReport } from '@/lib/types';
import type { TestType } from '@/db/schema';

interface DownloadReportButtonProps {
  report: FieldReport;
  projectName?: string;
  projectLocation?: string;
  technicianName?: string;
  testType?: TestType | null;
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
  variant = 'outline',
  size = 'sm',
  className,
}: DownloadReportButtonProps) {
  // PDFDownloadLink is client-only — avoid SSR hydration mismatch
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const fileName = `rapport-${report.id.slice(0, 8).toUpperCase()}-${report.materialType}.pdf`;

  if (!isClient) {
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
