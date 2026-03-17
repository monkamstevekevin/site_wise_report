'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mapUserToRoleAndId } from '@/lib/constants';
import type { FieldReport, Project, User } from '@/lib/types';
import { getReportsSubscription, getReportsByTechnicianIdSubscription } from '@/lib/reportClientService';
import { getProjectsSubscription } from '@/lib/projectClientService';
import { getUsersSubscription, getUserByIdSubscription } from '@/lib/userClientService';
import { logger } from '@/lib/logger';

export function useDashboardData() {
  const { user, loading: authLoading } = useAuth();

  const [allReportsData, setAllReportsData] = useState<FieldReport[]>([]);
  const [allProjectsData, setAllProjectsData] = useState<Project[]>([]);
  const [allUsersData, setAllUsersData] = useState<User[]>([]);
  const [currentUserDetails, setCurrentUserDetails] = useState<User | null>(null);
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const { role, effectiveTechnicianId } = useMemo(() => mapUserToRoleAndId(user), [user]);

  useEffect(() => {
    if (authLoading) {
      setIsLoadingDashboardData(true);
      return;
    }
    if (!user) {
      setIsLoadingDashboardData(false);
      return;
    }

    const subscriptions: (() => void)[] = [];
    let active = true;

    const handleSubscriptionError = (entity: string) => (error: Error) => {
      if (active) {
        logger.error(`useDashboardData.subscribe.${entity}`, error);
        setDashboardError((prev) => prev || `Impossible de charger ${entity}.`);
        setIsLoadingDashboardData(false);
      }
    };

    if (role === 'ADMIN' || role === 'SUPERVISOR') {
      subscriptions.push(
        getReportsSubscription(
          user.organizationId,
          (data) => active && setAllReportsData(data),
          handleSubscriptionError('reports')
        ),
        getProjectsSubscription(
          user.organizationId,
          (data) => active && setAllProjectsData(data),
          handleSubscriptionError('projects')
        ),
        getUsersSubscription(
          user.organizationId,
          (data) => active && setAllUsersData(data),
          handleSubscriptionError('users')
        )
      );
    } else if (role === 'TECHNICIAN' && effectiveTechnicianId) {
      subscriptions.push(
        getReportsByTechnicianIdSubscription(
          effectiveTechnicianId,
          (data) => active && setAllReportsData(data),
          handleSubscriptionError('technician reports')
        ),
        getProjectsSubscription(
          user.organizationId,
          (data) => active && setAllProjectsData(data),
          handleSubscriptionError('projects')
        ),
        getUserByIdSubscription(
          user.id,
          (data) => active && setCurrentUserDetails(data),
          handleSubscriptionError('current user details')
        )
      );
    }

    setIsLoadingDashboardData(false);

    return () => {
      active = false;
      subscriptions.forEach((unsub) => unsub());
    };
  }, [user, authLoading, role, effectiveTechnicianId]);

  return {
    allReportsData,
    allProjectsData,
    allUsersData,
    currentUserDetails,
    isLoadingDashboardData,
    dashboardError,
    role,
    effectiveTechnicianId,
    authLoading,
  };
}
