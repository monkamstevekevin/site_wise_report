'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { CompactionSummaryReportPDF } from './CompactionSummaryReportPDF';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { CompactionTestRow, CompactionReportData } from '@/db/schema';

interface DownloadCompactionSummaryButtonProps {
  projectId: string;
  projectName?: string;
  projectLocation?: string;
  orgLogoUrl?: string | null;
  orgName?: string | null;
  compactionHeader?: Partial<CompactionReportData>;
  entrepreneur?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadCompactionSummaryButton({
  projectId,
  projectName,
  projectLocation,
  orgLogoUrl,
  orgName,
  compactionHeader = {},
  entrepreneur,
  variant = 'outline',
  size = 'sm',
  className,
}: DownloadCompactionSummaryButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [rows, setRows] = useState<CompactionTestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    fetch(`/api/compaction-rows?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data: CompactionTestRow[]) => {
        setRows(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isClient, projectId]);

  if (!isClient || loading) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> RC-6304
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <CompactionSummaryReportPDF
          rows={rows}
          header={compactionHeader}
          projectName={projectName}
          projectLocation={projectLocation}
          orgLogoUrl={orgLogoUrl}
          orgName={orgName}
          entrepreneur={entrepreneur}
        />
      }
      fileName={`RC-6304-${projectId.slice(0, 8).toUpperCase()}.pdf`}
    >
      {({ loading: gen }) => (
        <Button variant={variant} size={size} className={className} disabled={gen}>
          {gen ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-1.5" /> RC-6304
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
