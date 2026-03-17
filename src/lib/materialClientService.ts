// Client-side material subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Material } from '@/lib/types';

type Unsubscribe = () => void;

type MaterialRow = {
  id: string;
  name: string;
  type: string;
  min_density: string | null;
  max_density: string | null;
  min_temperature: string | null;
  max_temperature: string | null;
  created_at: string;
  updated_at: string;
};

function mapRowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Material['type'],
    validationRules: {
      minDensity: row.min_density != null ? Number(row.min_density) : undefined,
      maxDensity: row.max_density != null ? Number(row.max_density) : undefined,
      minTemperature: row.min_temperature != null ? Number(row.min_temperature) : undefined,
      maxTemperature: row.max_temperature != null ? Number(row.max_temperature) : undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAll(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  orgId?: string | null
): Promise<Material[]> {
  let query = supabase.from('materials').select('*').order('name', { ascending: true });
  // Matériaux globaux (organizationId IS NULL) + matériaux de l'org courante
  if (orgId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${orgId}`);
  } else {
    query = query.is('organization_id', null);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as MaterialRow[]).map(mapRowToMaterial);
}

export function getMaterialsSubscription(
  onUpdate: (materials: Material[]) => void,
  onError: (error: Error) => void,
  orgId?: string | null
): Unsubscribe {
  const supabase = createSupabaseBrowserClient();

  fetchAll(supabase, orgId).then(onUpdate).catch(onError);

  const channelName = orgId ? `materials-org-${orgId}` : 'materials-global';
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
      fetchAll(supabase, orgId).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
