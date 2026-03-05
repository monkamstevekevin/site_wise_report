
'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { BarChart3, AlertTriangleIcon, Download, TrendingUp, TrendingDown, Minus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getReportsSubscription } from '@/lib/reportClientService';
import { getUsersSubscription } from '@/lib/userClientService';
import type { FieldReport, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplierStat {
  name: string;
  total: number;
  validated: number;
  rejected: number;
  submitted: number;
  anomalies: number;
  conformity: number | null;
  lastDate: string;
}

interface TechnicianStat {
  id: string;
  name: string;
  total: number;
  validated: number;
  rejected: number;
  submitted: number;
  anomalies: number;
  validationRate: number | null; // % parmi les décidés
  lastDate: string;
}

const MATERIAL_LABELS: Record<string, string> = {
  cement: 'Ciment', asphalt: 'Asphalte', gravel: 'Gravier', sand: 'Sable', other: 'Autre',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function conformityColor(pct: number | null): string {
  if (pct === null) return 'bg-slate-100 text-slate-600';
  if (pct >= 90) return 'bg-emerald-100 text-emerald-700';
  if (pct >= 70) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function conformityBarColor(pct: number | null): string {
  if (pct === null) return '#94a3b8';
  if (pct >= 90) return '#16a34a';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

function exportSupplierCSV(stats: SupplierStat[]) {
  const headers = ['Fournisseur', 'Total tests', 'Validés', 'Rejetés', 'En attente', 'Anomalies IA', 'Taux de conformité (%)', 'Dernier test'];
  const rows = stats.map(s => [
    s.name,
    s.total,
    s.validated,
    s.rejected,
    s.submitted,
    s.anomalies,
    s.conformity ?? 'N/D',
    s.lastDate ? format(new Date(s.lastDate), 'd MMM yyyy', { locale: fr }) : 'N/D',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-fournisseurs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    const unsub = getReportsSubscription(
      user?.organizationId,
      (data) => { setReports(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user) return;
    const unsub = getUsersSubscription(
      user?.organizationId,
      (data) => setUsers(data),
      () => {}
    );
    return unsub;
  }, [user, authLoading]);

  // ── Supplier stats ──────────────────────────────────────────────────────────
  const supplierStats = useMemo((): SupplierStat[] => {
    const map: Record<string, SupplierStat> = {};
    reports.forEach(r => {
      const name = r.supplier?.trim() || 'Fournisseur inconnu';
      if (!map[name]) {
        map[name] = { name, total: 0, validated: 0, rejected: 0, submitted: 0, anomalies: 0, conformity: null, lastDate: r.createdAt };
      }
      const s = map[name];
      s.total++;
      if (r.status === 'VALIDATED') s.validated++;
      else if (r.status === 'REJECTED') s.rejected++;
      else if (r.status === 'SUBMITTED') s.submitted++;
      if (r.aiIsAnomalous === true) s.anomalies++;
      if (new Date(r.createdAt) > new Date(s.lastDate)) s.lastDate = r.createdAt;
    });

    return Object.values(map)
      .map(s => {
        const decided = s.validated + s.rejected;
        return { ...s, conformity: decided > 0 ? Math.round((s.validated / decided) * 100) : null };
      })
      .sort((a, b) => {
        if (a.conformity === null && b.conformity === null) return b.total - a.total;
        if (a.conformity === null) return 1;
        if (b.conformity === null) return -1;
        return b.conformity - a.conformity; // best first
      });
  }, [reports]);

  // ── Material stats ──────────────────────────────────────────────────────────
  const materialStats = useMemo(() => {
    const map: Record<string, { total: number; validated: number; rejected: number; anomalies: number }> = {};
    reports.forEach(r => {
      const m = r.materialType;
      if (!map[m]) map[m] = { total: 0, validated: 0, rejected: 0, anomalies: 0 };
      map[m].total++;
      if (r.status === 'VALIDATED') map[m].validated++;
      else if (r.status === 'REJECTED') map[m].rejected++;
      if (r.aiIsAnomalous === true) map[m].anomalies++;
    });
    return Object.entries(map).map(([type, s]) => {
      const decided = s.validated + s.rejected;
      return {
        label: MATERIAL_LABELS[type] ?? type,
        ...s,
        conformity: decided > 0 ? Math.round((s.validated / decided) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [reports]);

  // ── Technician stats ────────────────────────────────────────────────────────
  const technicianStats = useMemo((): TechnicianStat[] => {
    const userMap: Record<string, string> = {};
    users.forEach(u => { userMap[u.id] = u.name; });

    const map: Record<string, TechnicianStat> = {};
    reports.forEach(r => {
      const id = r.technicianId;
      if (!map[id]) {
        map[id] = { id, name: userMap[id] ?? id.substring(0, 8) + '…', total: 0, validated: 0, rejected: 0, submitted: 0, anomalies: 0, validationRate: null, lastDate: r.createdAt };
      }
      const s = map[id];
      s.total++;
      if (r.status === 'VALIDATED') s.validated++;
      else if (r.status === 'REJECTED') s.rejected++;
      else if (r.status === 'SUBMITTED') s.submitted++;
      if (r.aiIsAnomalous === true) s.anomalies++;
      if (new Date(r.createdAt) > new Date(s.lastDate)) s.lastDate = r.createdAt;
    });

    return Object.values(map)
      .map(s => {
        const decided = s.validated + s.rejected;
        return { ...s, validationRate: decided > 0 ? Math.round((s.validated / decided) * 100) : null };
      })
      .sort((a, b) => b.total - a.total);
  }, [reports, users]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    supplierStats
      .filter(s => s.conformity !== null)
      .slice(0, 10)
      .map(s => ({ name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name, conformité: s.conformity, fill: conformityBarColor(s.conformity) })),
    [supplierStats]
  );

  if (authLoading || loading) {
    return (
      <>
        <PageTitle title="Analyses & Performance" icon={BarChart3} subtitle="Chargement..." />
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Analyses & Performance"
        icon={BarChart3}
        subtitle="Classement des fournisseurs et performance par matériau."
        actions={
          supplierStats.length > 0 && (
            <Button variant="outline" className="rounded-lg" onClick={() => exportSupplierCSV(supplierStats)}>
              <Download className="mr-2 h-4 w-4" /> Exporter CSV
            </Button>
          )
        }
      />

      {/* ── Bar chart ─────────────────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="mr-2 h-4 w-4 text-primary" /> Taux de Conformité par Fournisseur
            </CardTitle>
            <CardDescription>Top {chartData.length} fournisseurs avec au moins un rapport décidé.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} angle={-35} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Conformité']} />
                <Bar dataKey="conformité" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Supplier table ──────────────────────────────────────────────── */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Classement des Fournisseurs</CardTitle>
            <CardDescription>{supplierStats.length} fournisseur(s) · trié par taux de conformité décroissant</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {supplierStats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">Aucun rapport disponible.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-3 font-medium">Fournisseur</th>
                      <th className="text-center px-3 py-3 font-medium">Tests</th>
                      <th className="text-center px-3 py-3 font-medium">✓ Valid.</th>
                      <th className="text-center px-3 py-3 font-medium">✗ Rejet.</th>
                      <th className="text-center px-3 py-3 font-medium">⚠ Anom.</th>
                      <th className="text-center px-3 py-3 font-medium">Conformité</th>
                      <th className="text-right px-4 py-3 font-medium">Dernier test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierStats.map((s, i) => (
                      <tr key={s.name} className={cn('border-b border-border/40 hover:bg-muted/30 transition-colors', i % 2 === 0 ? '' : 'bg-muted/10')}>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                          <div className="flex items-center gap-2">
                            {s.conformity !== null && s.conformity >= 90 && <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            {s.conformity !== null && s.conformity < 70 && <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                            {(s.conformity === null || (s.conformity >= 70 && s.conformity < 90)) && <Minus className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                            <span className="truncate">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-muted-foreground">{s.total}</td>
                        <td className="px-3 py-3 text-center text-emerald-600 font-semibold">{s.validated}</td>
                        <td className="px-3 py-3 text-center text-red-600 font-semibold">{s.rejected}</td>
                        <td className="px-3 py-3 text-center text-orange-500 font-semibold">{s.anomalies || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={cn('text-xs font-semibold border-0', conformityColor(s.conformity))}>
                            {s.conformity !== null ? `${s.conformity}%` : 'N/D'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {format(new Date(s.lastDate), 'd MMM yyyy', { locale: fr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Material performance ────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Performance par Matériau</CardTitle>
            <CardDescription>Taux de conformité par type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {materialStats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Aucune donnée.</p>
            ) : (
              materialStats.map(m => (
                <div key={m.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      m.conformity >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      m.conformity >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    )}>
                      {m.conformity}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        m.conformity >= 90 ? 'bg-emerald-500' : m.conformity >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${m.conformity}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.total} test(s) · {m.validated} validé(s) · {m.anomalies} anomalie(s)
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Technician performance ─────────────────────────────────────────── */}
      {technicianStats.length > 0 && (
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Users className="mr-2 h-4 w-4 text-primary" /> Performance des Techniciens
            </CardTitle>
            <CardDescription>{technicianStats.length} technicien(s) · trié par nombre de rapports</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Technicien</th>
                    <th className="text-center px-3 py-3 font-medium">Rapports</th>
                    <th className="text-center px-3 py-3 font-medium">✓ Valid.</th>
                    <th className="text-center px-3 py-3 font-medium">✗ Rejet.</th>
                    <th className="text-center px-3 py-3 font-medium">⏳ Attente</th>
                    <th className="text-center px-3 py-3 font-medium">⚠ Anom.</th>
                    <th className="text-center px-3 py-3 font-medium">Taux valid.</th>
                    <th className="text-right px-4 py-3 font-medium">Dernier rapport</th>
                  </tr>
                </thead>
                <tbody>
                  {technicianStats.map((t, i) => (
                    <tr key={t.id} className={cn('border-b border-border/40 hover:bg-muted/30 transition-colors', i % 2 === 0 ? '' : 'bg-muted/10')}>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                        <span className="truncate">{t.name}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground font-semibold">{t.total}</td>
                      <td className="px-3 py-3 text-center text-emerald-600 font-semibold">{t.validated}</td>
                      <td className="px-3 py-3 text-center text-red-600 font-semibold">{t.rejected}</td>
                      <td className="px-3 py-3 text-center text-amber-600 font-semibold">{t.submitted || '—'}</td>
                      <td className="px-3 py-3 text-center text-orange-500 font-semibold">{t.anomalies || '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={cn('text-xs font-semibold border-0', conformityColor(t.validationRate))}>
                          {t.validationRate !== null ? `${t.validationRate}%` : 'N/D'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {format(new Date(t.lastDate), 'd MMM yyyy', { locale: fr })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
