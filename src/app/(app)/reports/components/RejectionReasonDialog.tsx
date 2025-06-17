
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { FieldReport } from '@/lib/types';
import { Loader2, Send } from 'lucide-react';

const rejectionReasonSchema = z.object({
  reason: z.string().min(1, 'La raison du rejet est requise.').max(500, 'La raison ne peut excéder 500 caractères.'),
});

type RejectionReasonFormData = z.infer<typeof rejectionReasonSchema>;

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: FieldReport | null;
  onConfirmRejection: (reportId: string, reason: string) => Promise<void>;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  report,
  onConfirmRejection,
}: RejectionReasonDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RejectionReasonFormData>({
    resolver: zodResolver(rejectionReasonSchema),
    defaultValues: {
      reason: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ reason: '' });
      setIsSubmitting(false);
    }
  }, [open, form]);

  const handleSubmit = async (data: RejectionReasonFormData) => {
    if (!report) return;
    setIsSubmitting(true);
    try {
      await onConfirmRejection(report.id, data.reason);
    } catch (error) {
      console.error("Erreur de soumission RejectionReasonDialog:", error);
    }
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeter le Rapport : {report.id}</DialogTitle>
          <DialogDescription>
            Veuillez fournir une raison pour le rejet de ce rapport. Elle sera montrée au technicien.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison du Rejet</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Les mesures de densité sont hors tolérance, veuillez revérifier."
                      rows={4}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Confirmer le Rejet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

