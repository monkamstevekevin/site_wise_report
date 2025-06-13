
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
  materials: Material[]; // Accept materials as a prop
  onEditMaterial?: (material: Material) => void;
  onDeleteMaterial?: (materialId: string) => void;
}

const materialTypeBadgeVariant: Record<Material['type'], "default" | "secondary" | "outline" | "destructive"> = {
  cement: "default",
  asphalt: "secondary",
  gravel: "outline",
  sand: "destructive",
  other: "outline",
};

const formatValidationRules = (rules?: Material['validationRules']): string => {
  if (!rules) return 'N/A';
  const parts: string[] = [];
  if (rules.minDensity !== undefined && rules.maxDensity !== undefined) {
    parts.push(`Density: ${rules.minDensity}-${rules.maxDensity} kg/m³`);
  } else if (rules.minDensity !== undefined) {
    parts.push(`Min Density: ${rules.minDensity} kg/m³`);
  } else if (rules.maxDensity !== undefined) {
    parts.push(`Max Density: ${rules.maxDensity} kg/m³`);
  }

  if (rules.minTemperature !== undefined && rules.maxTemperature !== undefined) {
    parts.push(`Temp: ${rules.minTemperature}-${rules.maxTemperature} °C`);
  } else if (rules.minTemperature !== undefined) {
    parts.push(`Min Temp: ${rules.minTemperature} °C`);
  } else if (rules.maxTemperature !== undefined) {
    parts.push(`Max Temp: ${rules.maxTemperature} °C`);
  }
  return parts.join(', ') || 'N/A';
};

export function MaterialTable({ materials, onEditMaterial, onDeleteMaterial }: MaterialTableProps) {

  const handleEdit = (material: Material) => {
    onEditMaterial?.(material);
  };

  const handleDelete = (materialId: string) => {
    onDeleteMaterial?.(materialId);
  };

  if (materials.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No materials match the current filters.</p>;
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Material ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Validation Rules</TableHead>
            <TableHead>Created At</TableHead>
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
              <TableCell>{new Date(material.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(material)} disabled>
                       <Edit className="mr-2 h-4 w-4" /> Edit (Soon)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(material.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete (Soon)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {materials.length > 5 && <TableCaption>A list of {materials.length} materials in the system.</TableCaption>}
    </div>
  );
}
