
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
  reason: z.string().min(1, 'Rejection reason is required.').max(500, 'Reason cannot exceed 500 characters.'),
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
      // onOpenChange(false) will be called by the parent page after successful submission
    } catch (error) {
      // Error typically handled by parent's onConfirmRejection toast
      console.error("RejectionReasonDialog submission error:", error);
    } finally {
      // Do not setIsSubmitting(false) here if parent closes dialog,
      // but it's safer to reset it in case parent doesn't close it on error
      // setIsSubmitting(false); // Parent will usually close dialog, which resets state via useEffect
    }
  };

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Report: {report.id}</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this report. This will be shown to the technician.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rejection Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Density measurements are out of tolerance, please re-verify."
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
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
