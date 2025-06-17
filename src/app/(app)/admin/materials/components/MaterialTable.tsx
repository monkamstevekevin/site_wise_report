
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/types';

interface MaterialTableProps {
  materials: Material[];
  onEditMaterial?: (material: Material) => void;
  onDeleteMaterial?: (material: Material) => void;
}

const materialTypeBadgeVariant: Record<Material['type'], "default" | "secondary" | "outline" | "destructive"> = {
  cement: "default",
  asphalt: "secondary",
  gravel: "outline",
  sand: "destructive",
  other: "outline",
};

const formatValidationRules = (rules?: Material['validationRules']): string => {
  if (!rules || Object.keys(rules).length === 0) return 'N/A';
  const parts: string[] = [];
  if (rules.minDensity !== undefined && rules.maxDensity !== undefined) {
    parts.push(`Densité: ${rules.minDensity}-${rules.maxDensity} kg/m³`);
  } else if (rules.minDensity !== undefined) {
    parts.push(`Densité Min: ${rules.minDensity} kg/m³`);
  } else if (rules.maxDensity !== undefined) {
    parts.push(`Densité Max: ${rules.maxDensity} kg/m³`);
  }

  if (rules.minTemperature !== undefined && rules.maxTemperature !== undefined) {
    parts.push(`Temp: ${rules.minTemperature}-${rules.maxTemperature} °C`);
  } else if (rules.minTemperature !== undefined) {
    parts.push(`Temp Min: ${rules.minTemperature} °C`);
  } else if (rules.maxTemperature !== undefined) {
    parts.push(`Temp Max: ${rules.maxTemperature} °C`);
  }
  return parts.join(', ') || 'N/A';
};

export function MaterialTable({ materials, onEditMaterial, onDeleteMaterial }: MaterialTableProps) {

  const handleEdit = (material: Material) => {
    onEditMaterial?.(material);
  };

  const handleDelete = (material: Material) => {
    onDeleteMaterial?.(material);
  };

  if (materials.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aucun matériau ne correspond aux filtres actuels.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        {materials.length > 5 && <TableCaption>Une liste de {materials.length} matériaux dans le système.</TableCaption>}
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID Matériau</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Règles de Validation</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium text-xs">{material.id}</TableCell>
              <TableCell>{material.name}</TableCell>
              <TableCell>
                <Badge variant={materialTypeBadgeVariant[material.type] || 'outline'}>{material.type}</Badge>
              </TableCell>
              <TableCell className="text-xs">{formatValidationRules(material.validationRules)}</TableCell>
              <TableCell>{new Date(material.createdAt).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Ouvrir le menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(material)}>
                       <Edit className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(material)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

