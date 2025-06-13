
'use client';

import React, { useState, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { TestTube2, PlusCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialTable } from './components/MaterialTable';
import type { Material } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Moved mockMaterials here
const mockMaterialsData: Material[] = [
  {
    id: 'MAT001',
    name: 'High-Strength Concrete Mix C40',
    type: 'cement',
    validationRules: { minDensity: 2300, maxDensity: 2500, minTemperature: 5, maxTemperature: 30 },
    createdAt: new Date('2023-01-20T10:00:00Z').toISOString(),
    updatedAt: new Date('2023-01-20T10:00:00Z').toISOString(),
  },
  {
    id: 'MAT002',
    name: 'Asphalt Binder PG 64-22',
    type: 'asphalt',
    validationRules: { minTemperature: 135, maxTemperature: 165 },
    createdAt: new Date('2023-02-10T11:30:00Z').toISOString(),
    updatedAt: new Date('2024-03-15T09:45:00Z').toISOString(),
  },
  {
    id: 'MAT003',
    name: 'Crushed Limestone Aggregate 3/4"',
    type: 'gravel',
    validationRules: { minDensity: 1600, maxDensity: 1800 },
    createdAt: new Date('2023-03-05T14:15:00Z').toISOString(),
    updatedAt: new Date('2023-03-05T14:15:00Z').toISOString(),
  },
  {
    id: 'MAT004',
    name: 'Washed Construction Sand',
    type: 'sand',
    createdAt: new Date('2023-04-01T09:00:00Z').toISOString(),
    updatedAt: new Date('2023-04-01T09:00:00Z').toISOString(),
  },
  {
    id: 'MAT005',
    name: 'Geotextile Fabric Type II',
    type: 'other',
    createdAt: new Date('2023-05-12T16:30:00Z').toISOString(),
    updatedAt: new Date('2024-01-10T12:00:00Z').toISOString(),
  },
];

const materialTypeFilterOptions: { value: Material['type'] | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'cement', label: 'Cement' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'other', label: 'Other' },
];

export default function MaterialManagementPage() {
  const { toast } = useToast(); // For future use with actions
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<Material['type'] | 'ALL'>('ALL');

  const handleAddNewMaterial = () => {
    alert("Add New Material functionality coming soon!");
    // Would typically open a form dialog
  };

  const handleEditMaterial = (material: Material) => {
    console.log("Edit material (simulated):", material.id);
    toast({ title: "Edit Material (Simulated)", description: `Form for material ${material.id} would open.`});
  };

  const handleDeleteMaterial = (materialId: string) => {
    console.log("Delete material (simulated):", materialId);
    toast({
      variant: "destructive",
      title: "Delete Material (Simulated)",
      description: `Material ${materialId} would be deleted.`
    });
    // Implement actual deletion and re-fetch/update `mockMaterialsData`
  };

  const filteredMaterials = useMemo(() => {
    return mockMaterialsData.filter(material => {
      const matchesSearchTerm = searchTerm === '' ||
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || material.type === typeFilter;
      return matchesSearchTerm && matchesType;
    });
  }, [searchTerm, typeFilter]);

  return (
    <>
      <PageTitle
        title="Material Management"
        icon={TestTube2}
        subtitle="Define materials and their validation parameters."
        actions={
          <Button className="rounded-lg" onClick={handleAddNewMaterial}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Material
          </Button>
        }
      />

      <div className="mb-6 p-4 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Label htmlFor="material-search" className="mb-1 block text-sm font-medium">Search Materials</Label>
            <Input
              id="material-search"
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="type-filter" className="mb-1 block text-sm font-medium">Filter by Type</Label>
            <Select value={typeFilter} onValueChange={(value: Material['type'] | 'ALL') => setTypeFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]" id="type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {materialTypeFilterOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('ALL');}} className="h-10">
            <Filter className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </div>
      </div>

      <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
        <MaterialTable
          materials={filteredMaterials}
          onEditMaterial={handleEditMaterial}
          onDeleteMaterial={handleDeleteMaterial}
        />
      </div>
    </>
  );
}
