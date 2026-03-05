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

async function fetchAll(supabase: ReturnType<typeof createSupabaseBrowserClient>): Promise<Material[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MaterialRow[]).map(mapRowToMaterial);
}

export function getMaterialsSubscription(
  onUpdate: (materials: Material[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const supabase = createSupabaseBrowserClient();

  fetchAll(supabase).then(onUpdate).catch(onError);

  const channel = supabase
    .channel('materials-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
      fetchAll(supabase).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
