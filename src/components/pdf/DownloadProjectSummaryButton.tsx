'use client';

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ProjectSummaryPDFDocument } from './ProjectSummaryPDFDocument';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import type { FieldReport, Project } from '@/lib/types';

interface Props {
  project: Project;
  reports: FieldReport[];
  orgLogoUrl?: string | null;
  orgName?: string | null;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadProjectSummaryButton({ project, reports, orgLogoUrl, orgName, variant = 'default', size = 'sm', className }: Props) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const fileName = `synthese-${project.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}-${new Date().toISOString().slice(0, 10)}.pdf`;

  if (!isClient) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Download className="h-4 w-4 mr-1.5" /> Rapport PDF
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={<ProjectSummaryPDFDocument project={project} reports={reports} orgLogoUrl={orgLogoUrl} orgName={orgName} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant={variant} size={size} className={className} disabled={loading}>
          {loading
            ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Génération...</>
            : <><Download className="h-4 w-4 mr-1.5" /> Rapport PDF</>
          }
        </Button>
      )}
    </PDFDownloadLink>
  );
}
