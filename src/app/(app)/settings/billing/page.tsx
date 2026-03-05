'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/common/PageTitle';
import { CreditCard, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';

const PLANS = [
  {
    key: 'STARTER' as const,
    name: 'Starter',
    price: 49,
    description: 'Idéal pour les petites équipes',
    features: [
      'Jusqu\'à 5 utilisateurs',
      'Rapports illimités',
      'Analyse de conformité IA',
      'Export PDF & CSV',
      'Support email',
    ],
  },
  {
    key: 'PRO' as const,
    name: 'Pro',
    price: 149,
    description: 'Pour les grandes équipes sans limite',
    features: [
      'Utilisateurs illimités',
      'Rapports illimités',
      'Analyse de conformité IA',
      'Export PDF & CSV',
      'Chat temps réel',
      'Support prioritaire',
      'API access',
    ],
    recommended: true,
  },
];

function BillingContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Paiement réussi !', description: 'Votre abonnement a été activé. Bienvenue sur le plan payant !' });
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ variant: 'destructive', title: 'Paiement annulé', description: 'Votre abonnement n\'a pas été modifié.' });
    }
  }, [searchParams, toast]);

  const handleChoosePlan = async (plan: 'STARTER' | 'PRO') => {
    setLoadingPlan(plan);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: data.error ?? 'Impossible de créer la session de paiement.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur réseau', description: 'Impossible de contacter le serveur de paiement.' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: data.error ?? 'Impossible d\'ouvrir le portail.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur réseau', description: 'Impossible de contacter le serveur.' });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, differenceInDays(new Date(user.trialEndsAt), new Date()))
    : null;

  const currentPlan = user?.organizationPlan ?? 'TRIAL';
  const isActive = user?.organizationStatus === 'ACTIVE';

  return (
    <>
      <PageTitle
        title="Abonnement & Facturation"
        icon={CreditCard}
        subtitle="Gérez votre plan et vos informations de facturation."
      />

      {/* Current status */}
      <Card className="mb-8 max-w-2xl">
        <CardHeader>
          <CardTitle>Plan actuel</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 flex-wrap">
          <div>
            <Badge variant={isActive ? 'default' : 'secondary'} className="text-sm">
              {currentPlan === 'TRIAL' ? 'Essai gratuit' : currentPlan}
            </Badge>
          </div>
          {trialDaysLeft !== null && currentPlan === 'TRIAL' && (
            <p className="text-sm text-muted-foreground">
              {trialDaysLeft > 0
                ? `Il vous reste ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''} d'essai.`
                : 'Votre période d\'essai est terminée.'}
            </p>
          )}
          {isActive && currentPlan !== 'TRIAL' && (
            <p className="text-sm text-emerald-600 font-medium">Abonnement actif</p>
          )}
          {isActive && currentPlan !== 'TRIAL' && user?.role === 'ADMIN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPortal}
              disabled={isOpeningPortal}
              className="ml-auto"
            >
              {isOpeningPortal ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Gérer mon abonnement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key && isActive;
          return (
            <Card key={plan.key} className={plan.recommended ? 'border-primary shadow-md' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.recommended && <Badge>Recommandé</Badge>}
                  {isCurrent && <Badge variant="secondary">Actuel</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mois</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  disabled={isCurrent || loadingPlan !== null || user?.role !== 'ADMIN'}
                  onClick={() => handleChoosePlan(plan.key)}
                >
                  {loadingPlan === plan.key ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isCurrent ? 'Plan actuel' : `Choisir ${plan.name}`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {user?.role !== 'ADMIN' && (
        <p className="mt-6 text-sm text-muted-foreground max-w-2xl">
          Seul un administrateur peut gérer l&apos;abonnement.
        </p>
      )}
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
