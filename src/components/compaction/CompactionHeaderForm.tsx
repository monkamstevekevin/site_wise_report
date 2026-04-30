'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
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

type MatValue = Partial<CompactionReportData['material1']>;

function MaterialFields({
  value,
  onChange,
}: {
  value: MatValue;
  onChange: (patch: MatValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <div className="col-span-2">
        <Label className="text-xs">Nom / Description</Label>
        <Input
          value={value?.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="ex. Gravier concassé 0-20mm"
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Provenance</Label>
        <Input
          value={value?.source ?? ''}
          onChange={(e) => onChange({ source: e.target.value })}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Masse vol. max (kg/m³)</Label>
        <Input
          type="number"
          value={value?.maxDensity ?? ''}
          onChange={(e) => onChange({ maxDensity: Number(e.target.value) })}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Méthode densité</Label>
        <Select
          value={value?.densityMethod ?? ''}
          onValueChange={(v) => onChange({ densityMethod: v as 'proctor' | 'planche' })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Choisir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proctor">Proctor</SelectItem>
            <SelectItem value="planche">Planche d&apos;essai</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Teneur eau opt. (%)</Label>
        <Input
          type="number"
          value={value?.optimalMoisture ?? ''}
          onChange={(e) => onChange({ optimalMoisture: Number(e.target.value) })}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Exigence compaction (%)</Label>
        <Select
          value={String(value?.compactionReq ?? '')}
          onValueChange={(v) => onChange({ compactionReq: Number(v) })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="%" />
          </SelectTrigger>
          <SelectContent>
            {COMPACTION_REQS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CompactionHeaderForm({ value, onChange }: CompactionHeaderFormProps) {
  const [showMat2, setShowMat2] = useState(!!value.material2?.name);

  const set = (patch: Partial<CompactionReportData>) => onChange({ ...value, ...patch });

  const setMat1 = (patch: MatValue) =>
    set({ material1: { ...defaultMat, ...value.material1, ...patch } });

  const setMat2 = (patch: MatValue) =>
    set({ material2: { ...defaultMat, ...value.material2, ...patch } });

  const workCategories =
    value.workType === 'BATIMENT' ? WORK_CATEGORIES_BATIMENT : WORK_CATEGORIES_ROUTE;

  return (
    <div className="space-y-3">
      {/* ─── Card 1: Informations du chantier ─────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Informations du chantier</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Heure arrivée</Label>
            <Input
              type="time"
              value={value.arrivalTime ?? ''}
              onChange={(e) => set({ arrivalTime: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Heure départ</Label>
            <Input
              type="time"
              value={value.departureTime ?? ''}
              onChange={(e) => set({ departureTime: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">No Nucléodensimètre</Label>
            <Input
              value={value.nucleoNo ?? ''}
              onChange={(e) => set({ nucleoNo: e.target.value })}
              placeholder="ex. 123456"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Type de travaux</Label>
            <Select
              value={value.workType ?? ''}
              onValueChange={(v) =>
                set({ workType: v as 'ROUTE' | 'BATIMENT', workCategory: '' })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Route / Bâtiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ROUTE">Route</SelectItem>
                <SelectItem value="BATIMENT">Bâtiment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catégorie de travaux</Label>
            <Select
              value={value.workCategory ?? ''}
              onValueChange={(v) => set({ workCategory: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {workCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Chaînage (de → à)</Label>
            <div className="flex gap-1.5">
              <Input
                value={value.chainageFrom ?? ''}
                onChange={(e) => set({ chainageFrom: e.target.value })}
                placeholder="0+000"
                className="h-8 text-sm"
              />
              <Input
                value={value.chainageTo ?? ''}
                onChange={(e) => set({ chainageTo: e.target.value })}
                placeholder="0+100"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Entrepreneur</Label>
            <Input
              value={value.entrepreneur ?? ''}
              onChange={(e) => set({ entrepreneur: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Sous-traitant</Label>
            <Input
              value={value.subcontractor ?? ''}
              onChange={(e) => set({ subcontractor: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Card 2: Matériaux de référence ───────────────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Matériaux de référence</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          {/* Matériau 1 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Matériau 1
            </p>
            <MaterialFields value={value.material1 ?? {}} onChange={setMat1} />
          </div>

          {/* Matériau 2 – togglable */}
          {showMat2 ? (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Matériau 2
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  title="Retirer le 2ème matériau"
                  onClick={() => {
                    setShowMat2(false);
                    set({ material2: undefined });
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <MaterialFields value={value.material2 ?? {}} onChange={setMat2} />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed text-muted-foreground"
              onClick={() => setShowMat2(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter un 2ème matériau
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
