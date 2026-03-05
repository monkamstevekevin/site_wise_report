'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical, Thermometer, Scale, TestTube2, CalendarDays } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Material } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MaterialTableProps {
  materials: Material[];
  onEditMaterial?: (material: Material) => void;
  onDeleteMaterial?: (material: Material) => void;
}

const TYPE_CONFIG: Record<string, { label: string; bar: string; pill: string }> = {
  cement:  { label: 'Ciment',   bar: 'bg-stone-400',  pill: 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:ring-stone-700' },
  asphalt: { label: 'Asphalte', bar: 'bg-zinc-700',   pill: 'bg-zinc-800 text-zinc-100 ring-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-600' },
  gravel:  { label: 'Gravier',  bar: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800' },
  sand:    { label: 'Sable',    bar: 'bg-yellow-400', pill: 'bg-yellow-50 text-yellow-700 ring-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:ring-yellow-800' },
  other:   { label: 'Autre',    bar: 'bg-purple-400', pill: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:ring-purple-800' },
};

const formatRule = (rules?: Material['validationRules']): { density: string | null; temp: string | null } => {
  if (!rules) return { density: null, temp: null };
  let density: string | null = null;
  let temp: string | null = null;
  if (rules.minDensity !== undefined && rules.maxDensity !== undefined) density = `${rules.minDensity}–${rules.maxDensity} kg/m³`;
  else if (rules.minDensity !== undefined) density = `≥ ${rules.minDensity} kg/m³`;
  else if (rules.maxDensity !== undefined) density = `≤ ${rules.maxDensity} kg/m³`;
  if (rules.minTemperature !== undefined && rules.maxTemperature !== undefined) temp = `${rules.minTemperature}–${rules.maxTemperature} °C`;
  else if (rules.minTemperature !== undefined) temp = `≥ ${rules.minTemperature} °C`;
  else if (rules.maxTemperature !== undefined) temp = `≤ ${rules.maxTemperature} °C`;
  return { density, temp };
};

export function MaterialTable({ materials, onEditMaterial, onDeleteMaterial }: MaterialTableProps) {
  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-card rounded-xl border border-border/60">
        <div className="rounded-full bg-muted p-4">
          <TestTube2 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground">Aucun matériau ne correspond aux filtres actuels.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {materials.map(material => {
        const cfg = TYPE_CONFIG[material.type] ?? TYPE_CONFIG.other;
        const rules = formatRule(material.validationRules);

        return (
          <div
            key={material.id}
            className="group relative rounded-xl border border-border/70 bg-card overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            {/* Color accent bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bar)} />

            <div className="pl-5 pr-4 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                {/* Main info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{material.name}</h3>
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                        cfg.pill
                      )}>
                        <TestTube2 className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onEditMaterial?.(material)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteMaterial?.(material)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Validation rules + date */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {rules.density && (
                      <span className="flex items-center gap-1">
                        <Scale className="h-3 w-3" /> Densité : <span className="font-medium text-foreground">{rules.density}</span>
                      </span>
                    )}
                    {rules.temp && (
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3" /> Temp : <span className="font-medium text-foreground">{rules.temp}</span>
                      </span>
                    )}
                    {!rules.density && !rules.temp && (
                      <span className="italic text-muted-foreground/60">Aucune règle de validation</span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(material.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
