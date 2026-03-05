// Client-side project subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Project } from '@/lib/types';

type Unsubscribe = () => void;

type ProjectRow = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  project_materials: { material_id: string }[];
};

function mapRowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    description: row.description ?? undefined,
    status: row.status as Project['status'],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    assignedMaterialIds: row.project_materials.map((pm) => pm.material_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAll(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  orgId?: string
): Promise<Project[]> {
  let query = supabase
    .from('projects')
    .select('*, project_materials(material_id)')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as ProjectRow[]).map(mapRowToProject);
}

export function getProjectsSubscription(
  orgId: string | null | undefined,
  onUpdate: (projects: Project[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const supabase = createSupabaseBrowserClient();

  fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);

  const channelFilter = orgId ? { filter: `organization_id=eq.${orgId}` } : {};

  const channel = supabase
    .channel(`projects-all-${orgId ?? 'global'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', ...channelFilter }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'project_materials' }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
