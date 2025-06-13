
'use client';

import React, { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User, Project } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';

interface AssignProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  allProjects: Project[];
  onAssignProjects: (userId: string, selectedProjectIds: string[]) => Promise<void>;
}

export function AssignProjectsDialog({
  open,
  onOpenChange,
  user,
  allProjects,
  onAssignProjects,
}: AssignProjectsDialogProps) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setSelectedProjectIds(user.assignedProjectIds || []);
    } else {
      setSelectedProjectIds([]);
    }
  }, [user, open]);

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    await onAssignProjects(user.id, selectedProjectIds);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Projects to {user.name}</DialogTitle>
          <DialogDescription>
            Select the projects you want to assign to this user.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 pr-6">
          <div className="space-y-3 py-4">
            {allProjects.length === 0 && <p className="text-muted-foreground">No projects available.</p>}
            {allProjects.map(project => (
              <div key={project.id} className="flex items-center space-x-3 rounded-md p-2 hover:bg-muted/50">
                <Checkbox
                  id={`project-${project.id}`}
                  checked={selectedProjectIds.includes(project.id)}
                  onCheckedChange={() => handleProjectToggle(project.id)}
                  disabled={isSubmitting}
                />
                <Label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">{project.location} (ID: {project.id})</div>
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
