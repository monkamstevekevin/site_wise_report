'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FieldReport } from '@/lib/types';
import {
  MATERIAL_TYPE_DISPLAY,
  MATERIAL_CHART_COLORS,
  SUPPLIER_CHART_COLORS,
} from '@/lib/report-constants';

export function useDashboardCharts(allReportsData: FieldReport[]) {
  const materialUsageData = useMemo(() => {
    const counts: Record<string, number> = {
      cement: 0, asphalt: 0, gravel: 0, sand: 0, other: 0,
    };
    allReportsData.forEach((report) => {
      const key = report.materialType.toLowerCase();
      if (key in counts) counts[key]++;
      else counts.other++;
    });
    return Object.entries(counts).map(([material, reportCount]) => ({
      material: MATERIAL_TYPE_DISPLAY[material] || material.charAt(0).toUpperCase() + material.slice(1),
      reports: reportCount,
      fill: MATERIAL_CHART_COLORS[material] || MATERIAL_CHART_COLORS.other,
    }));
  }, [allReportsData]);

  const supplierUsageData = useMemo(() => {
    const supplierCounts: Record<string, number> = {};
    allReportsData.forEach((report) => {
      const supplier = report.supplier || 'Fournisseur Inconnu';
      supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
    });
    const sorted = Object.entries(supplierCounts).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, 4).map(([name, reports], i) => ({
      name,
      reports,
      fill: SUPPLIER_CHART_COLORS[i],
    }));
    const otherCount = sorted.slice(4).reduce((sum, [, count]) => sum + count, 0);
    if (otherCount > 0) {
      top.push({ name: 'Autres Fournisseurs', reports: otherCount, fill: SUPPLIER_CHART_COLORS[4] });
    }
    return top;
  }, [allReportsData]);

  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: fr }),
        validés: 0,
        rejetés: 0,
        soumis: 0,
      };
    });
    allReportsData.forEach((report) => {
      const m = format(new Date(report.createdAt), 'yyyy-MM');
      const entry = months.find((x) => x.key === m);
      if (!entry) return;
      if (report.status === 'VALIDATED') entry.validés++;
      else if (report.status === 'REJECTED') entry.rejetés++;
      else if (report.status === 'SUBMITTED') entry.soumis++;
    });
    return months.map(({ label, validés, rejetés, soumis }) => ({ label, validés, rejetés, soumis }));
  }, [allReportsData]);

  const complianceTrendData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM', { locale: fr }),
        validés: 0,
        rejetés: 0,
      };
    });
    allReportsData.forEach((report) => {
      const m = format(new Date(report.updatedAt), 'yyyy-MM');
      const entry = months.find((x) => x.key === m);
      if (!entry) return;
      if (report.status === 'VALIDATED') entry.validés++;
      else if (report.status === 'REJECTED') entry.rejetés++;
    });
    return months.map(({ label, validés, rejetés }) => {
      const total = validés + rejetés;
      return { label, conformité: total > 0 ? Math.round((validés / total) * 100) : 0 };
    });
  }, [allReportsData]);

  return { materialUsageData, supplierUsageData, monthlyChartData, complianceTrendData };
}
