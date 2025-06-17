
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-8 text-center">
        <Skeleton className="h-24 w-24 rounded-full mb-8" />
        <Skeleton className="h-12 w-3/4 max-w-md mb-6" />
        <Skeleton className="h-6 w-full max-w-xl mb-10" />
        <div className="space-x-4">
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-48 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-1/2 max-w-xs mt-12" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/10 p-8 text-center">
      <div className="mb-8 animate-pulse">
        <Building className="h-24 w-24 text-primary" />
      </div>
      <h1 className="text-5xl md:text-6xl font-headline font-bold text-foreground mb-6">
        Bienvenue sur <span className="text-primary">SiteWise Reports</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
        Optimisation de la collecte de données de terrain, des rapports et de la validation en génie civil avec précision et efficacité.
      </p>
      <div className="space-x-4">
        {user ? (
          <>
            <Button asChild size="lg" className="rounded-xl">
              <Link href="/dashboard">Aller au Tableau de Bord</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/reports/create">Créer un Nouveau Rapport</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild size="lg" className="rounded-xl">
              <Link href="/auth/login">
                <LogIn className="mr-2 h-5 w-5" /> Connexion
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link href="/auth/signup">S'inscrire</Link>
            </Button>
          </>
        )}
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        Garantir la qualité et la conformité, un rapport à la fois.
      </p>
    </div>
  );
}
