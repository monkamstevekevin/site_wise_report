'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTestTypesForProject, setProjectTestTypes } from '@/services/testTypeService';
import { getProjects } from '@/services/projectService';
import type { TestType } from '@/db/schema';
import type { Project } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  CONCRETE: 'Béton', SOIL: 'Sol', ASPHALT: 'Asphalte',
  GRANULAT: 'Granulats', CEMENT: 'Ciment', FIELD: 'Terrain',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  testTypes: TestType[];
  orgId: string | null;
}

export function AssignTestTypesDialog({ open, onOpenChange, testTypes, orgId }: Props) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getProjects(orgId ?? undefined).then((data) => {
      const active = data.filter((p) => p.status !== 'COMPLETED');
      setProjects(active);
      if (active.length > 0 && !selectedProjectId) {
        setSelectedProjectId(active[0].id);
      }
    });
  }, [open, orgId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    getTestTypesForProject(selectedProjectId).then((assigned) => {
      setCheckedIds(new Set(assigned.map((t) => t.id)));
      setLoading(false);
    });
  }, [selectedProjectId]);

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await setProjectTestTypes(selectedProjectId, Array.from(checkedIds));
      toast({ title: 'Types de tests assignés avec succès' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // Group by category
  const grouped = testTypes.reduce<Record<string, TestType[]>>((acc, tt) => {
    (acc[tt.category] ??= []).push(tt);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigner des tests à un projet</DialogTitle>
          <DialogDescription>
            Sélectionnez le projet puis cochez les types de tests disponibles pour les techniciens.
          </DialogDescription>
        </DialogHeader>

        {/* Sélecteur de projet */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Projet</Label>
          <select
            className="w-full border rounded-md h-9 px-3 text-sm bg-background"
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Types de tests groupés */}
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Chargement…</p>
        ) : (
          <div className="space-y-4 mt-2">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
                  <div className="space-y-1.5">
                    {items.map((tt) => (
                      <div key={tt.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-muted/50">
                        <Checkbox
                          id={tt.id}
                          checked={checkedIds.has(tt.id)}
                          onCheckedChange={() => toggle(tt.id)}
                        />
                        <Label htmlFor={tt.id} className="text-sm cursor-pointer flex-1">{tt.name}</Label>
                        <span className="text-xs text-muted-foreground">{tt.fields.length} champs</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !selectedProjectId}>
            {saving ? 'Enregistrement…' : `Sauvegarder (${checkedIds.size} sélectionné${checkedIds.size > 1 ? 's' : ''})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
