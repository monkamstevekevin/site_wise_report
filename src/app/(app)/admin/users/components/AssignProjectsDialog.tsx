
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User, Project, UserAssignment } from '@/lib/types';
import { Loader2, Save, CalendarDays } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from 'date-fns';

interface AssignProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  allProjects: Project[];
  onAssignProjects: (userId: string, newAssignments: UserAssignment[]) => Promise<void>;
}

type AssignmentType = UserAssignment['assignmentType'];
type TempAssignment = { projectId: string; assignmentType: AssignmentType | 'NOT_ASSIGNED' };

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'PP');
  } catch (e) {
    return 'Invalid Date';
  }
};

export function AssignProjectsDialog({
  open,
  onOpenChange,
  user,
  allProjects,
  onAssignProjects,
}: AssignProjectsDialogProps) {
  const [tempAssignments, setTempAssignments] = useState<TempAssignment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      // Initialize tempAssignments:
      // For each project, find if the user has an assignment for it.
      // If yes, use that assignmentType. Otherwise, set to 'NOT_ASSIGNED'.
      const initialAssignments = allProjects.map(project => {
        const existingAssignment = user.assignments?.find(a => a.projectId === project.id);
        return {
          projectId: project.id,
          assignmentType: existingAssignment ? existingAssignment.assignmentType : 'NOT_ASSIGNED',
        };
      });
      setTempAssignments(initialAssignments);
    } else if (!open) {
      setTempAssignments([]); // Reset when dialog closes
    }
  }, [user, allProjects, open]);

  const handleAssignmentTypeChange = (projectId: string, newType: TempAssignment['assignmentType']) => {
    setTempAssignments(prev =>
      prev.map(a => (a.projectId === projectId ? { ...a, assignmentType: newType } : a))
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Filter out 'NOT_ASSIGNED' and map to UserAssignment[]
      const finalAssignments: UserAssignment[] = tempAssignments
        .filter(a => a.assignmentType !== 'NOT_ASSIGNED')
        .map(a => ({
          projectId: a.projectId,
          assignmentType: a.assignmentType as AssignmentType, // Cast because we filtered 'NOT_ASSIGNED'
        }));
      await onAssignProjects(user.id, finalAssignments);
    } catch (error) {
      console.error("AssignProjectsDialog submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Projects & Type to {user.name}</DialogTitle>
          <DialogDescription>
            Select projects and specify the assignment type (Part-time or Full-time).
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-80 pr-2">
          <div className="space-y-4 py-4">
            {allProjects.length === 0 && <p className="text-muted-foreground text-center">No projects available to assign.</p>}
            {allProjects.map(project => {
              const currentAssignment = tempAssignments.find(a => a.projectId === project.id);
              return (
                <div key={project.id} className="p-3 border rounded-lg shadow-sm hover:bg-muted/50">
                  <div className="mb-2">
                    <p className="font-semibold text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <CalendarDays className="inline-block mr-1 h-3 w-3" />
                       {formatDate(project.startDate)} - {formatDate(project.endDate)} (Status: {project.status})
                    </p>
                  </div>
                  <RadioGroup
                    value={currentAssignment?.assignmentType || 'NOT_ASSIGNED'}
                    onValueChange={(value) => handleAssignmentTypeChange(project.id, value as TempAssignment['assignmentType'])}
                    className="flex space-x-2 md:space-x-4"
                    disabled={isSubmitting}
                  >
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="NOT_ASSIGNED" id={`none-${project.id}`} />
                      <Label htmlFor={`none-${project.id}`} className="text-xs font-normal">Not Assigned</Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="PART_TIME" id={`part-${project.id}`} />
                      <Label htmlFor={`part-${project.id}`} className="text-xs font-normal">Part-time</Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="FULL_TIME" id={`full-${project.id}`} />
                      <Label htmlFor={`full-${project.id}`} className="text-xs font-normal">Full-time</Label>
                    </div>
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting || allProjects.length === 0} className="rounded-lg">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
