
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageTitle } from '@/components/common/PageTitle';
import { Briefcase, Loader2, AlertTriangle, Search } from 'lucide-react';
import type { Project, User, UserAssignment } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectsSubscription } from '@/lib/projectClientService';
import { getUserByIdSubscription } from '@/lib/userClientService';
import { MyProjectCard } from './components/MyProjectCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; 

export default function MyProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setError("Veuillez vous connecter pour voir vos projets.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubProjects = getProjectsSubscription(
      (fetchedProjects) => {
        setAllProjects(fetchedProjects);
        if (currentUserData) setIsLoading(false);
      },
      (err) => {
        setError((err as Error).message || "Échec du chargement des projets.");
        setIsLoading(false);
      }
    );

    const unsubUser = getUserByIdSubscription(
      user.uid,
      (fetchedCurrentUser) => {
        setCurrentUserData(fetchedCurrentUser);
        if (allProjects.length > 0 || !isLoading) setIsLoading(false);
      },
      (err) => {
        setError((err as Error).message || "Échec du chargement des données utilisateur.");
        setIsLoading(false);
      }
    );
    
    return () => {
      unsubProjects();
      unsubUser();
    };
  }, [user, authLoading]);

  const assignedProjects = useMemo(() => {
    if (!currentUserData || !currentUserData.assignments) return [];
    const userProjectIds = new Set(currentUserData.assignments.map(a => a.projectId));
    return allProjects.filter(p => userProjectIds.has(p.id));
  }, [allProjects, currentUserData]);

  const filteredAssignedProjects = useMemo(() => {
    if (!searchTerm) return assignedProjects;
    return assignedProjects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assignedProjects, searchTerm]);

  if (authLoading || (isLoading && !error) ) { 
    return (
      <>
        <PageTitle title="Mes Projets Assignés" icon={Briefcase} subtitle="Chargement de vos projets..." />
        <div className="mb-6">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3 mt-1" /></CardContent>
              <CardFooter className="flex justify-end gap-2"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></CardFooter>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title="Mes Projets Assignés" icon={Briefcase} subtitle="Impossible de charger vos projets." />
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
        <PageTitle title="Mes Projets Assignés" icon={Briefcase} subtitle="Connectez-vous pour voir vos projets." />
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
        title="Mes Projets Assignés"
        icon={Briefcase}
        subtitle="Accédez aux discussions et détails des projets auxquels vous êtes assigné."
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Recherchez vos projets par nom, lieu ou ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-lg pl-10 rounded-lg"
        />
      </div>

      {filteredAssignedProjects.length === 0 && !isLoading && (
         <Card className="shadow-lg text-center py-8">
             <CardHeader>
                <CardTitle>Aucun Projet Trouvé</CardTitle>
             </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    {searchTerm ? "Aucun projet ne correspond à votre recherche." : "Vous n'êtes actuellement assigné à aucun projet, ou les projets sont encore en cours de chargement."}
                </p>
            </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAssignedProjects.map(project => (
          <MyProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}
