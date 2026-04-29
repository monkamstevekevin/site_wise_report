'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface CompactionRowDraft {
  localisation: string;
  testDate: string;          // 'YYYY-MM-DD'
  materialRef: string;       // 'mat1' | 'mat2'
  requiredPercent: string;
  waterContent: string;
  dryDensity: string;
  retained5mm: string;
  correctedDensity: string;
  compactionPercent: string;
  isCompliant: boolean | null;
  sampleTaken: boolean | null;
  sampleNo: string;
  remarks: string;
}

const emptyRow = (): CompactionRowDraft => ({
  localisation: '',
  testDate: '',
  materialRef: 'mat1',
  requiredPercent: '',
  waterContent: '',
  dryDensity: '',
  retained5mm: '',
  correctedDensity: '',
  compactionPercent: '',
  isCompliant: null,
  sampleTaken: null,
  sampleNo: '',
  remarks: '',
});

interface CompactionTestTableProps {
  rows: CompactionRowDraft[];
  onRowsChange: (rows: CompactionRowDraft[]) => void;
  material1Name?: string;
  material2Name?: string;
}

export function CompactionTestTable({
  rows,
  onRowsChange,
  material1Name = 'Mat. 1',
  material2Name = 'Mat. 2',
}: CompactionTestTableProps) {
  const addRow = () => onRowsChange([...rows, emptyRow()]);

  const removeRow = (i: number) =>
    onRowsChange(rows.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<CompactionRowDraft>) =>
    onRowsChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1 text-left whitespace-nowrap">Localisation</th>
              <th className="px-2 py-1 text-left whitespace-nowrap">Date</th>
              <th className="px-2 py-1 text-left whitespace-nowrap">Matériau</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">% exigé</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">w (%)</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">ρd (kg/m³)</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">R5mm (%)</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">ρd corr.</th>
              <th className="px-2 py-1 text-right whitespace-nowrap">% comp.</th>
              <th className="px-2 py-1 text-center whitespace-nowrap">C/NC</th>
              <th className="px-2 py-1 text-center whitespace-nowrap">Prél.</th>
              <th className="px-2 py-1 text-left whitespace-nowrap">No Éch.</th>
              <th className="px-2 py-1 text-left whitespace-nowrap">Remarques</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {/* Localisation */}
                <td className="px-1 py-0.5">
                  <Input
                    className="h-7 text-xs w-24"
                    value={row.localisation}
                    onChange={(e) => updateRow(i, { localisation: e.target.value })}
                  />
                </td>
                {/* Date */}
                <td className="px-1 py-0.5">
                  <Input
                    type="date"
                    className="h-7 text-xs w-28"
                    value={row.testDate}
                    onChange={(e) => updateRow(i, { testDate: e.target.value })}
                  />
                </td>
                {/* Matériau */}
                <td className="px-1 py-0.5">
                  <Select
                    value={row.materialRef}
                    onValueChange={(v) => updateRow(i, { materialRef: v })}
                  >
                    <SelectTrigger className="h-7 text-xs w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mat1">{material1Name}</SelectItem>
                      <SelectItem value="mat2">{material2Name}</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* % exigé */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    className="h-7 text-xs w-14 text-right"
                    value={row.requiredPercent}
                    onChange={(e) => updateRow(i, { requiredPercent: e.target.value })}
                  />
                </td>
                {/* w % */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    step="0.1"
                    className="h-7 text-xs w-14 text-right"
                    value={row.waterContent}
                    onChange={(e) => updateRow(i, { waterContent: e.target.value })}
                  />
                </td>
                {/* ρd */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    className="h-7 text-xs w-16 text-right"
                    value={row.dryDensity}
                    onChange={(e) => updateRow(i, { dryDensity: e.target.value })}
                  />
                </td>
                {/* R5mm */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    step="0.1"
                    className="h-7 text-xs w-14 text-right"
                    value={row.retained5mm}
                    onChange={(e) => updateRow(i, { retained5mm: e.target.value })}
                  />
                </td>
                {/* ρd corr */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    className="h-7 text-xs w-16 text-right"
                    value={row.correctedDensity}
                    onChange={(e) => updateRow(i, { correctedDensity: e.target.value })}
                  />
                </td>
                {/* % comp */}
                <td className="px-1 py-0.5">
                  <Input
                    type="number"
                    step="0.1"
                    className="h-7 text-xs w-14 text-right"
                    value={row.compactionPercent}
                    onChange={(e) => updateRow(i, { compactionPercent: e.target.value })}
                  />
                </td>
                {/* C/NC */}
                <td className="px-1 py-0.5 text-center">
                  <Select
                    value={
                      row.isCompliant === null
                        ? ''
                        : row.isCompliant
                        ? 'C'
                        : 'NC'
                    }
                    onValueChange={(v) =>
                      updateRow(i, {
                        isCompliant: v === 'C' ? true : v === 'NC' ? false : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-14">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="NC">NC</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* Prél. */}
                <td className="px-1 py-0.5 text-center">
                  <Select
                    value={
                      row.sampleTaken === null ? '' : row.sampleTaken ? 'O' : 'N'
                    }
                    onValueChange={(v) =>
                      updateRow(i, {
                        sampleTaken: v === 'O' ? true : v === 'N' ? false : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-12">
                      <SelectValue placeholder="-" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="O">O</SelectItem>
                      <SelectItem value="N">N</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                {/* No Éch. */}
                <td className="px-1 py-0.5">
                  <Input
                    className="h-7 text-xs w-16"
                    value={row.sampleNo}
                    onChange={(e) => updateRow(i, { sampleNo: e.target.value })}
                  />
                </td>
                {/* Remarques */}
                <td className="px-1 py-0.5">
                  <Input
                    className="h-7 text-xs w-28"
                    value={row.remarks}
                    onChange={(e) => updateRow(i, { remarks: e.target.value })}
                  />
                </td>
                {/* Supprimer */}
                <td className="px-1 py-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-3 text-center text-muted-foreground text-xs"
                >
                  Aucun essai ajouté. Cliquez sur &quot;Ajouter un essai&quot; ci-dessous.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1" /> Ajouter un essai
      </Button>
    </div>
  );
}
