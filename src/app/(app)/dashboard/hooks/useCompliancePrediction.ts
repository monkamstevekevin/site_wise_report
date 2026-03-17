'use client';

import { useState, useEffect } from 'react';
import type { FieldReport, Project } from '@/lib/types';
import type { UserRole } from '@/lib/constants';
import { MATERIAL_TYPE_DISPLAY } from '@/lib/report-constants';
import { predictCompliancePercentage, type CompliancePredictionOutput } from '@/ai/flows/compliance-prediction';
import { logger } from '@/lib/logger';

export function useCompliancePrediction(
  role: UserRole,
  allReportsData: FieldReport[],
  allProjectsData: Project[]
) {
  const [currentCompliancePrediction, setCurrentCompliancePrediction] =
    useState<CompliancePredictionOutput | null>(null);
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  useEffect(() => {
    if ((role !== 'ADMIN' && role !== 'SUPERVISOR') || allReportsData.length === 0) return;

    let cancelled = false;
    setIsLoadingCompliance(true);
    setComplianceError(null);

    (async () => {
      try {
        const total = allReportsData.length;
        const validated = allReportsData.filter((r) => r.status === 'VALIDATED').length;
        const rejected = allReportsData.filter((r) => r.status === 'REJECTED').length;
        const submitted = allReportsData.filter((r) => r.status === 'SUBMITTED').length;
        const anomalies = allReportsData.filter((r) => r.aiIsAnomalous === true).length;
        const validationRate = total > 0 ? Math.round((validated / total) * 100) : 0;
        const materials = [...new Set(allReportsData.map((r) => r.materialType))]
          .map((m) => MATERIAL_TYPE_DISPLAY[m] || m)
          .join(', ');
        const activeProjects = allProjectsData.filter((p) => p.status === 'ACTIVE');

        const historicalData = `Total rapports: ${total}. Validés: ${validated} (${validationRate}%). Rejetés: ${rejected}. En attente: ${submitted}. Anomalies IA: ${anomalies}. Taux de conformité actuel: ${validationRate}%.`;
        const currentConditions = `Projets actifs: ${activeProjects.length} (${activeProjects.map((p) => p.name).slice(0, 3).join(', ')}${activeProjects.length > 3 ? '...' : ''}). Matériaux utilisés: ${materials || 'N/A'}. Rapports soumis en attente de validation: ${submitted}.`;
        const validationRules =
          'Asphalte: plage de température 135-165°C, densité 92-97% de Marshall. Béton: affaissement 75-125mm, résistance conforme classe. Gravier: granulométrie et propreté selon norme. Sable: teneur en eau < 5%, module de finesse 2.2-3.1.';

        const prediction = await predictCompliancePercentage({
          historicalData,
          currentConditions,
          validationRules,
        });

        if (!cancelled) setCurrentCompliancePrediction(prediction);
      } catch (error) {
        if (!cancelled) {
          logger.error('useCompliancePrediction', error);
          setComplianceError(
            (error as Error).message || "Échec de l'obtention de la prédiction de conformité IA."
          );
        }
      } finally {
        if (!cancelled) setIsLoadingCompliance(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, allReportsData, allProjectsData]);

  return { currentCompliancePrediction, isLoadingCompliance, complianceError };
}
