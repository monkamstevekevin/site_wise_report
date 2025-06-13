
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ChatInterface } from './components/ChatInterface';
import { useEffect, useState } from 'react';
import type { Project } from '@/lib/types';
import { getProjectById } from '@/services/projectService'; // Import the service
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      const fetchProjectDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedProject = await getProjectById(projectId);
          if (fetchedProject) {
            setProject(fetchedProject);
          } else {
            setError(`Project with ID ${projectId} not found.`);
          }
        } catch (err) {
          console.error("Error fetching project details for chat:", err);
          setError("Failed to load project details.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjectDetails();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <>
        <PageTitle title="Chat du Projet" icon={MessageCircle} subtitle="Chargement des détails du projet..." />
        <div className="mb-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </div>
        <Skeleton className="h-[calc(100vh-250px)] w-full rounded-lg" />
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <PageTitle title="Erreur" icon={MessageCircle} subtitle={error || "Détails du projet non disponibles."} />
        <Button variant="outline" asChild className="rounded-lg">
            <Link href="/admin/projects">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux projets
            </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={`Chat: ${project.name}`}
        icon={MessageCircle}
        subtitle={`Discussion pour le projet ID: ${projectId}`}
        actions={
          <Button variant="outline" asChild className="rounded-lg">
            <Link href="/admin/projects">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux projets
            </Link>
          </Button>
        }
      />
      <ChatInterface projectId={projectId} />
    </>
  );
}
