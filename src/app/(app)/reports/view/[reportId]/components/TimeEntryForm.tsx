'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  projectId: string;
  reportId: string;
  onSaved?: () => void;
}

export function TimeEntryForm({ projectId, reportId, onSaved }: Props) {
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedHours = parseFloat(hours);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Veuillez entrer un nombre d'heures valide." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          reportId,
          date: new Date().toISOString(),
          durationMinutes: Math.round(parsedHours * 60),
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Temps enregistré', description: 'Votre entrée de temps a été sauvegardée.' });
      setHours('');
      setNotes('');
      onSaved?.();
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: "Erreur lors de l'enregistrement du temps." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="h-4 w-4" />
        Enregistrer le temps passé
      </div>
      <div className="flex gap-3">
        <div className="w-32">
          <Label htmlFor="hours" className="text-xs">Heures</Label>
          <Input
            id="hours"
            type="number"
            min="0.25"
            step="0.25"
            placeholder="ex: 2.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="te-notes" className="text-xs">Notes (optionnel)</Label>
          <Input
            id="te-notes"
            placeholder="ex: Échantillonnage + déplacement"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={saving || !hours}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </form>
  );
}
