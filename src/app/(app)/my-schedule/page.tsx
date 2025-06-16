
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
// ScheduleView component will be removed from here if this page is deleted.
// For now, let's assume it's still here to avoid breaking its import if dashboard changes are separate.
// If this file is deleted, then ScheduleView's import in dashboard/page.tsx will need to be updated.
import { ScheduleView } from './components/ScheduleView'; 

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
        setError("Please log in to view your schedule.");
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
        console.error("Error fetching data for My Schedule:", err);
        setError((err as Error).message || "Failed to load schedule data.");
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
        <PageTitle title="My Schedule" icon={CalendarDays} subtitle="Loading your weekly assignments..." />
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
        <PageTitle title="My Schedule" icon={CalendarDays} subtitle="Could not load your schedule." />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {!user && <p className="mt-2">Please ensure you are logged in.</p>}
          </CardContent>
        </Card>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageTitle title="My Schedule" icon={CalendarDays} subtitle="Log in to see your schedule." />
        <Card className="shadow-lg text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">You need to be logged in to view this page.</p>
          </CardContent>
        </Card>
      </>
    );
  }

  // This page will be removed, so this return path might not be hit if deletion happens correctly.
  // If ScheduleView is moved before this file is deleted, the import path for ScheduleView would need adjustment.
  return (
    <>
      <PageTitle
        title="My Schedule"
        icon={CalendarDays}
        subtitle="Visualize your weekly project assignments."
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
                <p className="text-muted-foreground">Could not load your user data to display schedule.</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
