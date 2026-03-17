'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createTestType, updateTestType } from '@/services/testTypeService';
import type { TestType, TestFieldDef } from '@/db/schema';

const CATEGORIES = [
  { value: 'CONCRETE', label: 'Béton' },
  { value: 'SOIL',     label: 'Sol' },
  { value: 'ASPHALT',  label: 'Asphalte' },
  { value: 'GRANULAT', label: 'Granulats' },
  { value: 'CEMENT',   label: 'Ciment' },
  { value: 'FIELD',    label: 'Terrain' },
];

const FIELD_TYPES = [
  { value: 'number',  label: 'Nombre' },
  { value: 'text',    label: 'Texte' },
  { value: 'select',  label: 'Liste déroulante' },
  { value: 'boolean', label: 'Oui / Non' },
];

const EMPTY_FIELD: TestFieldDef = {
  key: '', label: '', type: 'number', unit: '', required: true,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingType: TestType | null;
  orgId: string | null;
}

export function TestTypeFormDialog({ open, onOpenChange, editingType, orgId }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('CONCRETE');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TestFieldDef[]>([{ ...EMPTY_FIELD }]);

  useEffect(() => {
    if (open) {
      if (editingType) {
        setName(editingType.name);
        setCategory(editingType.category);
        setDescription(editingType.description ?? '');
        setFields(editingType.fields.length > 0 ? editingType.fields : [{ ...EMPTY_FIELD }]);
      } else {
        setName(''); setCategory('CONCRETE'); setDescription('');
        setFields([{ ...EMPTY_FIELD }]);
      }
    }
  }, [open, editingType]);

  function addField() {
    setFields((prev) => [...prev, { ...EMPTY_FIELD }]);
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, patch: Partial<TestFieldDef>) {
    setFields((prev) => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  }

  // Auto-generate key from label
  function handleLabelChange(idx: number, label: string) {
    const key = label
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    updateField(idx, { label, key });
  }

  async function handleSubmit() {
    if (!name.trim()) { toast({ title: 'Nom requis', variant: 'destructive' }); return; }
    const validFields = fields.filter((f) => f.key && f.label);
    if (validFields.length === 0) { toast({ title: 'Au moins un champ requis', variant: 'destructive' }); return; }

    setSaving(true);
    try {
      if (editingType) {
        await updateTestType(editingType.id, { name, category: category as TestType['category'], description, fields: validFields });
        toast({ title: 'Type mis à jour' });
      } else {
        await createTestType({ name, category: category as TestType['category'], description, fields: validFields, organizationId: orgId, isDefault: false });
        toast({ title: 'Type créé' });
      }
      onOpenChange(false);
    } catch {
      toast({ title: 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingType ? 'Modifier le type de test' : 'Nouveau type de test'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nom + catégorie */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom du test *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Affaissement (Slump)" />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Norme applicable, contexte…" />
          </div>

          {/* Champs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Champs du formulaire</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un champ
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Label *</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                        placeholder="ex: Affaissement"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type *</Label>
                      <Select value={field.type} onValueChange={(v) => updateField(idx, { type: v as TestFieldDef['type'] })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeField(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {field.type === 'number' && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Unité</Label>
                          <Input value={field.unit ?? ''} onChange={(e) => updateField(idx, { unit: e.target.value })} placeholder="mm, °C, %" className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Min</Label>
                          <Input type="number" value={field.min ?? ''} onChange={(e) => updateField(idx, { min: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max</Label>
                          <Input type="number" value={field.max ?? ''} onChange={(e) => updateField(idx, { max: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-sm" />
                        </div>
                      </>
                    )}
                    {field.type === 'select' && (
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Options (une par ligne)</Label>
                        <Textarea
                          value={(field.options ?? []).join('\n')}
                          onChange={(e) => updateField(idx, { options: e.target.value.split('\n').filter(Boolean) })}
                          rows={3}
                          className="text-sm"
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}
                    <div className="space-y-1 flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id={`req-${idx}`}
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`req-${idx}`} className="text-xs cursor-pointer">Obligatoire</Label>
                    </div>
                  </div>

                  {field.key && (
                    <p className="text-xs text-muted-foreground font-mono">clé : {field.key}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Enregistrement…' : editingType ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
