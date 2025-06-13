
'use client';

import { PageTitle } from '@/components/common/PageTitle';
import { MessageCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { ChatInterface } from './components/ChatInterface';
import { mockProjectsData } from '@/app/(app)/admin/projects/page'; // Using existing mock
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // Find project name from mock data - in a real app, you'd fetch this
  const project = mockProjectsData.find(p => p.id === projectId);

  if (!project) {
    return (
      <>
        <PageTitle title="Chat du Projet" icon={MessageCircle} subtitle="Chargement des détails du projet..." />
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
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
