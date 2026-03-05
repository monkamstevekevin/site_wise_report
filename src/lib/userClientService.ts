// Client-side user subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User, UserAssignment } from '@/lib/types';

type Unsubscribe = () => void;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  user_assignments: { project_id: string; assignment_type: string }[];
};

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as User['role'],
    avatarUrl: row.avatar_url ?? undefined,
    assignments: row.user_assignments.map((a) => ({
      projectId: a.project_id,
      assignmentType: a.assignment_type as UserAssignment['assignmentType'],
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAll(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  orgId?: string
): Promise<User[]> {
  let query = supabase
    .from('users')
    .select('*, user_assignments(project_id, assignment_type)');

  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as UserRow[]).map(mapRowToUser);
}

async function fetchById(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_assignments(project_id, assignment_type)')
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }
  return mapRowToUser(data as UserRow);
}

export function getUsersSubscription(
  orgId: string | null | undefined,
  onUpdate: (users: User[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const supabase = createSupabaseBrowserClient();

  fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);

  const channelFilter = orgId ? { filter: `organization_id=eq.${orgId}` } : {};

  const channel = supabase
    .channel(`users-all-${orgId ?? 'global'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users', ...channelFilter }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_assignments' }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function getUserByIdSubscription(
  userId: string,
  onUpdate: (user: User | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const supabase = createSupabaseBrowserClient();

  fetchById(supabase, userId).then(onUpdate).catch(onError);

  const channel = supabase
    .channel(`user-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      () => { fetchById(supabase, userId).then(onUpdate).catch(onError); }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_assignments', filter: `user_id=eq.${userId}` },
      () => { fetchById(supabase, userId).then(onUpdate).catch(onError); }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
