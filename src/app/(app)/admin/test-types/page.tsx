'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { FlaskConical, Plus, Pencil, Trash2, Globe, Building2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getTestTypes, deleteTestType } from '@/services/testTypeService';
import type { TestType } from '@/db/schema';
import { TestTypeFormDialog } from './components/TestTypeFormDialog';
import { AssignTestTypesDialog } from './components/AssignTestTypesDialog';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  CONCRETE: { label: 'Béton',      color: 'bg-blue-100 text-blue-800' },
  SOIL:     { label: 'Sol',        color: 'bg-amber-100 text-amber-800' },
  ASPHALT:  { label: 'Asphalte',   color: 'bg-gray-100 text-gray-800' },
  GRANULAT: { label: 'Granulats',  color: 'bg-orange-100 text-orange-800' },
  CEMENT:   { label: 'Ciment',     color: 'bg-purple-100 text-purple-800' },
  FIELD:    { label: 'Terrain',    color: 'bg-green-100 text-green-800' },
};

export default function TestTypesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingType, setEditingType] = useState<TestType | null>(null);
  const [isPending, startTransition] = useTransition();

  const orgId = user?.organizationId ?? null;

  async function load() {
    setIsLoading(true);
    const data = await getTestTypes(orgId);
    setTestTypes(data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [orgId]);

  function handleEdit(tt: TestType) {
    setEditingType(tt);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingType(null);
    setFormOpen(true);
  }

  function handleDelete(tt: TestType) {
    if (tt.isDefault) {
      toast({ title: 'Impossible', description: 'Les types par défaut ne peuvent pas être supprimés.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Supprimer "${tt.name}" ?`)) return;
    startTransition(async () => {
      await deleteTestType(tt.id);
      toast({ title: 'Type supprimé' });
      load();
    });
  }

  // Group by category
  const grouped = testTypes.reduce<Record<string, TestType[]>>((acc, tt) => {
    (acc[tt.category] ??= []).push(tt);
    return acc;
  }, {});

  return (
    <>
      <PageTitle
        title="Types de tests"
        icon={FlaskConical}
        subtitle="Gérez les templates de tests disponibles et assignez-les à vos projets."
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nouveau type de test
        </Button>
        <Button onClick={() => setAssignOpen(true)} variant="outline" size="sm">
          <Layers className="h-4 w-4 mr-1" /> Assigner aux projets
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORY_LABELS).map(([cat, { label, color }]) => {
            const items = grouped[cat] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>
                  <span>{items.length} type{items.length > 1 ? 's' : ''}</span>
                </h2>
                <div className="space-y-2">
                  {items.map((tt) => (
                    <Card key={tt.id} className="border shadow-none">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-sm font-semibold">{tt.name}</CardTitle>
                              {tt.isDefault ? (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Globe className="h-3 w-3" /> Global
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Building2 className="h-3 w-3" /> Personnalisé
                                </Badge>
                              )}
                            </div>
                            {tt.description && (
                              <CardDescription className="mt-0.5 text-xs line-clamp-1">{tt.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => setExpandedId(expandedId === tt.id ? null : tt.id)}
                              title="Voir les champs"
                            >
                              {expandedId === tt.id
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            {!tt.isDefault && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tt)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(tt)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {expandedId === tt.id && (
                        <CardContent className="pt-0 pb-3 px-4">
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {tt.fields.length} champ{tt.fields.length > 1 ? 's' : ''}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                              {tt.fields.map((f) => (
                                <div key={f.key} className="flex items-center gap-1.5 text-xs bg-muted/50 rounded px-2 py-1">
                                  <span className="font-medium truncate">{f.label}</span>
                                  {f.unit && <span className="text-muted-foreground">({f.unit})</span>}
                                  {f.required && <span className="text-red-400 ml-auto">*</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TestTypeFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) load(); }}
        editingType={editingType}
        orgId={orgId}
      />

      <AssignTestTypesDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        testTypes={testTypes}
        orgId={orgId}
      />
    </>
  );
}
