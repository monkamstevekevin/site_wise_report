'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import type { Project, User, UserAssignment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects } from '@/services/projectService';
import { getUserById } from '@/services/userService';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleView } from '@/app/(app)/dashboard/components/ScheduleView';

export default function MySchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!user) {
        setError("Veuillez vous connecter pour voir votre planning.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const [fetchedProjects, fetchedCurrentUser] = await Promise.all([
          getProjects(),
          getUserById(user.uid), 
        ]);
        setAllProjects(fetchedProjects);
        setCurrentUserData(fetchedCurrentUser);
      } catch (err) {
        console.error("Erreur lors de la récupération des données pour Mon Planning:", err);
        setError((err as Error).message || "Échec du chargement des données du planning.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  const userAssignments = useMemo(() => {
    return currentUserData?.assignments || [];
  }, [currentUserData]);

  if (authLoading || (isLoading && !error)) {
    return (
      <>
        <PageTitle title="Mon Planning" icon={CalendarDays} subtitle="Chargement de vos assignations hebdomadaires..." />
        <Skeleton className="h-10 w-full max-w-md mb-4" /> {/* Placeholder for week navigation */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="min-h-[200px]">
              <CardHeader><Skeleton className="h-5 w-20 mb-1" /><Skeleton className="h-4 w-16" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-full mt-2" /></CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title="Mon Planning" icon={CalendarDays} subtitle="Impossible de charger votre planning." />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Erreur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {!user && <p className="mt-2">Veuillez vous assurer que vous êtes connecté.</p>}
          </CardContent>
        </Card>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageTitle title="Mon Planning" icon={CalendarDays} subtitle="Connectez-vous pour voir votre planning." />
        <Card className="shadow-lg text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">Vous devez être connecté pour voir cette page.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Mon Planning"
        icon={CalendarDays}
        subtitle="Visualisez vos assignations de projet hebdomadaires."
      />
      {currentUserData && (
        <ScheduleView
          assignments={userAssignments}
          allProjects={allProjects}
        />
      )}
      {!currentUserData && !isLoading && (
         <Card className="shadow-lg text-center py-8">
            <CardContent>
                <p className="text-muted-foreground">Impossible de charger vos données utilisateur pour afficher le planning.</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
