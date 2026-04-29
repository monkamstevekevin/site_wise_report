'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompactionReportData } from '@/db/schema';

interface CompactionHeaderFormProps {
  value: Partial<CompactionReportData>;
  onChange: (data: Partial<CompactionReportData>) => void;
}

const WORK_CATEGORIES_ROUTE = [
  { value: 'coussin_conduites', label: 'Coussin conduites' },
  { value: 'enrobage', label: 'Enrobage' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const WORK_CATEGORIES_BATIMENT = [
  { value: 'semelles', label: 'Semelles' },
  { value: 'dalles', label: 'Dalles' },
  { value: 'murs', label: 'Murs' },
  { value: 'stationnement', label: 'Stationnement' },
];

const COMPACTION_REQS = [
  { value: '90', label: '90%' },
  { value: '95', label: '95%' },
  { value: '98', label: '98%' },
];

const defaultMat = {
  name: '',
  source: '',
  maxDensity: 0,
  densityMethod: 'proctor' as const,
  optimalMoisture: 0,
  compactionReq: 95,
};

export function CompactionHeaderForm({ value, onChange }: CompactionHeaderFormProps) {
  const set = (patch: Partial<CompactionReportData>) => onChange({ ...value, ...patch });

  const setMat1 = (patch: Partial<CompactionReportData['material1']>) =>
    set({ material1: { ...defaultMat, ...value.material1, ...patch } });

  const setMat2 = (patch: Partial<NonNullable<CompactionReportData['material2']>>) =>
    set({ material2: { ...defaultMat, ...value.material2, ...patch } });

  const workCategories =
    value.workType === 'BATIMENT' ? WORK_CATEGORIES_BATIMENT : WORK_CATEGORIES_ROUTE;

  return (
    <div className="space-y-4">
      {/* Horaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Horaires &amp; Équipement</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Heure arrivée</Label>
            <Input
              type="time"
              value={value.arrivalTime ?? ''}
              onChange={(e) => set({ arrivalTime: e.target.value })}
            />
          </div>
          <div>
            <Label>Heure départ</Label>
            <Input
              type="time"
              value={value.departureTime ?? ''}
              onChange={(e) => set({ departureTime: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>No Nucléodensimètre</Label>
            <Input
              value={value.nucleoNo ?? ''}
              onChange={(e) => set({ nucleoNo: e.target.value })}
              placeholder="ex. 123456"
            />
          </div>
        </CardContent>
      </Card>

      {/* Matériau 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Matériau 1</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom / Description</Label>
            <Input
              value={value.material1?.name ?? ''}
              onChange={(e) => setMat1({ name: e.target.value })}
              placeholder="ex. Gravier concassé 0-20mm"
            />
          </div>
          <div>
            <Label>Provenance</Label>
            <Input
              value={value.material1?.source ?? ''}
              onChange={(e) => setMat1({ source: e.target.value })}
            />
          </div>
          <div>
            <Label>Masse vol. max (kg/m³)</Label>
            <Input
              type="number"
              value={value.material1?.maxDensity ?? ''}
              onChange={(e) => setMat1({ maxDensity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Méthode</Label>
            <Select
              value={value.material1?.densityMethod ?? ''}
              onValueChange={(v) => setMat1({ densityMethod: v as 'proctor' | 'planche' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Proctor / Planche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proctor">Proctor</SelectItem>
                <SelectItem value="planche">Planche d&apos;essai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teneur eau opt. (%)</Label>
            <Input
              type="number"
              value={value.material1?.optimalMoisture ?? ''}
              onChange={(e) => setMat1({ optimalMoisture: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Exigence compaction</Label>
            <Select
              value={String(value.material1?.compactionReq ?? '')}
              onValueChange={(v) => setMat1({ compactionReq: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="%" />
              </SelectTrigger>
              <SelectContent>
                {COMPACTION_REQS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Matériau 2 (optionnel) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Matériau 2 (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nom / Description</Label>
            <Input
              value={value.material2?.name ?? ''}
              onChange={(e) => setMat2({ name: e.target.value })}
              placeholder="Laisser vide si un seul matériau"
            />
          </div>
          <div>
            <Label>Provenance</Label>
            <Input
              value={value.material2?.source ?? ''}
              onChange={(e) => setMat2({ source: e.target.value })}
            />
          </div>
          <div>
            <Label>Masse vol. max (kg/m³)</Label>
            <Input
              type="number"
              value={value.material2?.maxDensity ?? ''}
              onChange={(e) => setMat2({ maxDensity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Méthode</Label>
            <Select
              value={value.material2?.densityMethod ?? ''}
              onValueChange={(v) => setMat2({ densityMethod: v as 'proctor' | 'planche' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Proctor / Planche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proctor">Proctor</SelectItem>
                <SelectItem value="planche">Planche d&apos;essai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Teneur eau opt. (%)</Label>
            <Input
              type="number"
              value={value.material2?.optimalMoisture ?? ''}
              onChange={(e) => setMat2({ optimalMoisture: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Exigence compaction</Label>
            <Select
              value={String(value.material2?.compactionReq ?? '')}
              onValueChange={(v) => setMat2({ compactionReq: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="%" />
              </SelectTrigger>
              <SelectContent>
                {COMPACTION_REQS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Type de travaux */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Type de travaux</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select
              value={value.workType ?? ''}
              onValueChange={(v) =>
                set({ workType: v as 'ROUTE' | 'BATIMENT', workCategory: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Route / Bâtiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTE">Route</SelectItem>
                <SelectItem value="BATIMENT">Bâtiment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select
              value={value.workCategory ?? ''}
              onValueChange={(v) => set({ workCategory: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {workCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chaînage de</Label>
            <Input
              value={value.chainageFrom ?? ''}
              onChange={(e) => set({ chainageFrom: e.target.value })}
              placeholder="0+000"
            />
          </div>
          <div>
            <Label>Chaînage à</Label>
            <Input
              value={value.chainageTo ?? ''}
              onChange={(e) => set({ chainageTo: e.target.value })}
              placeholder="0+100"
            />
          </div>
          <div>
            <Label>Entrepreneur</Label>
            <Input
              value={value.entrepreneur ?? ''}
              onChange={(e) => set({ entrepreneur: e.target.value })}
            />
          </div>
          <div>
            <Label>Sous-traitant</Label>
            <Input
              value={value.subcontractor ?? ''}
              onChange={(e) => set({ subcontractor: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
