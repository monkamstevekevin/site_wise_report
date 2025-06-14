
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { TestTube2, PlusCircle, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialTable } from './components/MaterialTable';
import { MaterialFormDialog, type MaterialSubmitData } from './components/MaterialFormDialog';
import type { Material, MaterialType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getMaterials, addMaterial, updateMaterial, deleteMaterial } from '@/services/materialService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const materialTypeFilterOptions: { value: MaterialType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'cement', label: 'Cement' },
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'other', label: 'Other' },
];

export default function MaterialManagementPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>(undefined);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | 'ALL'>('ALL');

  const fetchMaterials = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedMaterials = await getMaterials();
      setMaterials(fetchedMaterials);
    } catch (err) {
      setError((err as Error).message || "Failed to load materials. Please try again later.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleAddNewMaterial = () => {
    setEditingMaterial(undefined);
    setIsMaterialFormOpen(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setIsMaterialFormOpen(true);
  };

  const openDeleteDialog = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    try {
      await deleteMaterial(materialToDelete.id);
      toast({
        title: "Material Deleted",
        description: `Material "${materialToDelete.name}" (ID: ${materialToDelete.id}) has been deleted.`,
      });
      await fetchMaterials();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to Delete Material",
        description: (err as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);
    }
  };

  const handleMaterialFormSubmit = async (data: MaterialSubmitData, id?: string) => {
    setIsMaterialFormOpen(false);

    if (id) {
      try {
        await updateMaterial(id, data);
        toast({
          title: "Material Updated Successfully",
          description: `Material "${data.name}" has been updated.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Update Material",
          description: (err as Error).message || "An unexpected error occurred.",
        });
        setIsMaterialFormOpen(true); // Re-open dialog on error if needed
      }
    } else {
      try {
        const newMaterialId = await addMaterial(data);
        toast({
          title: "Material Added Successfully",
          description: `Material "${data.name}" (ID: ${newMaterialId}) has been added.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to Add Material",
          description: (err as Error).message || "An unexpected error occurred.",
        });
         setIsMaterialFormOpen(true); // Re-open dialog on error if needed
      }
    }
    await fetchMaterials();
    setEditingMaterial(undefined);
  };


  const filteredMaterials = useMemo(() => {
    return materials.filter(material => {
      const matchesSearchTerm = searchTerm === '' ||
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || material.type === typeFilter;
      return matchesSearchTerm && matchesType;
    });
  }, [materials, searchTerm, typeFilter]);

  return (
    <>
      <PageTitle
        title="Material Management"
        icon={TestTube2}
        subtitle="Define materials and their validation parameters."
        actions={
          <MaterialFormDialog
            open={isMaterialFormOpen}
            onOpenChange={(isOpen) => {
              setIsMaterialFormOpen(isOpen);
              if (!isOpen) setEditingMaterial(undefined);
            }}
            materialToEdit={editingMaterial}
            onFormSubmit={handleMaterialFormSubmit}
          >
            <Button className="rounded-lg" onClick={handleAddNewMaterial}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Material
            </Button>
          </MaterialFormDialog>
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
            <Select value={typeFilter} onValueChange={(value: MaterialType | 'ALL') => setTypeFilter(value)}>
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

      {isLoading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading materials...
        </div>
      )}
      {error && (
         <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
           <p className="font-semibold">Error Loading Materials</p>
           <p>{error}</p>
         </div>
      )}
      {!isLoading && !error && (
        <div className="bg-card p-0 md:p-6 rounded-lg shadow-md">
          <MaterialTable
            materials={filteredMaterials}
            onEditMaterial={handleEditMaterial}
            onDeleteMaterial={openDeleteDialog}
          />
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
              <AlertDialogTitle>Confirm Material Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete the material "{materialToDelete?.name}" (ID: {materialToDelete?.id})? This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMaterial}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Material
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
