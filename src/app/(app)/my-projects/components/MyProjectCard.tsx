
'use client';

import Link from 'next/link';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, MapPin, FileText } from 'lucide-react';

interface MyProjectCardProps {
  project: Project;
}

const projectStatusBadgeVariant: Record<Project['status'], "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  INACTIVE: "outline",
};

export function MyProjectCard({ project }: MyProjectCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-headline">{project.name}</CardTitle>
                <CardDescription className="flex items-center text-sm mt-1">
                    <MapPin className="mr-1.5 h-4 w-4 text-muted-foreground" /> {project.location}
                </CardDescription>
            </div>
            <Badge variant={projectStatusBadgeVariant[project.status] || 'outline'} className="ml-2 whitespace-nowrap">
                {project.status}
            </Badge>
        </div>
        {project.description && <p className="text-sm text-muted-foreground pt-2">{project.description}</p>}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Project ID: {project.id}</p>
        <p className="text-xs text-muted-foreground">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
        <Button variant="outline" asChild className="w-full sm:w-auto rounded-lg">
          <Link href={`/reports?projectId=${project.id}`}>
            <FileText className="mr-2 h-4 w-4" /> View Reports
          </Link>
        </Button>
        <Button asChild className="w-full sm:w-auto rounded-lg">
          <Link href={`/project/${project.id}/chat`}>
            <MessageSquare className="mr-2 h-4 w-4" /> Open Chat
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
