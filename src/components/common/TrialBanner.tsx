'use client';

import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export function TrialBanner() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.organizationStatus !== 'TRIALING') return null;
  if (!user.trialEndsAt) return null;

  const trialEnd = new Date(user.trialEndsAt);
  const now = new Date();

  if (trialEnd <= now) return null; // expired → UpgradeGate handles it

  const daysLeft = differenceInDays(trialEnd, now);

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> d&apos;essai restant{daysLeft > 1 ? 's' : ''} — profitez de toutes les fonctionnalités Pro gratuitement.
        </span>
      </div>
      {user.role === 'ADMIN' && (
        <Button asChild size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs">
          <Link href="/settings/billing">Passer à Pro</Link>
        </Button>
      )}
    </div>
  );
}
