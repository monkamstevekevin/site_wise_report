'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';

interface UpgradeGateProps {
  children: ReactNode;
}

export function UpgradeGate({ children }: UpgradeGateProps) {
  const { user } = useAuth();

  const isBlocked = (() => {
    if (!user) return false;
    if (user.organizationStatus === 'CANCELED') return true;
    if (user.organizationStatus === 'TRIALING' && user.trialEndsAt) {
      return new Date(user.trialEndsAt) < new Date();
    }
    return false;
  })();

  if (!isBlocked) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open modal>
        <DialogContent
          className="sm:max-w-md [&>button:last-child]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <Lock className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <DialogTitle className="text-center">Abonnement requis</DialogTitle>
            <DialogDescription className="text-center">
              {user?.organizationStatus === 'TRIALING'
                ? 'Votre période d\'essai a expiré. Passez à un plan payant pour continuer à utiliser SiteWise Reports.'
                : 'Votre abonnement a été annulé. Réactivez votre abonnement pour accéder à l\'application.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {user?.role === 'ADMIN' && (
              <Button asChild className="w-full">
                <Link href="/settings/billing">Voir les plans</Link>
              </Button>
            )}
            {user?.role !== 'ADMIN' && (
              <p className="text-center text-sm text-muted-foreground">
                Contactez votre administrateur pour réactiver l&apos;abonnement.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
