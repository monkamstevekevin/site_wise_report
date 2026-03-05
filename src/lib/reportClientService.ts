// Client-side report subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FieldReport } from '@/lib/types';

type Unsubscribe = () => void;

type ReportRow = {
  id: string;
  project_id: string;
  technician_id: string;
  material_type: string;
  temperature: string;
  volume: string;
  density: string;
  humidity: string;
  batch_number: string;
  supplier: string;
  sampling_method: string;
  notes: string | null;
  status: string;
  photo_url: string | null;
  rejection_reason: string | null;
  ai_is_anomalous: boolean | null;
  ai_anomaly_explanation: string | null;
  created_at: string;
  updated_at: string;
  report_attachments: { file_url: string }[];
};

function mapRowToFieldReport(row: ReportRow): FieldReport {
  return {
    id: row.id,
    projectId: row.project_id,
    technicianId: row.technician_id,
    materialType: row.material_type as FieldReport['materialType'],
    temperature: Number(row.temperature),
    volume: Number(row.volume),
    density: Number(row.density),
    humidity: Number(row.humidity),
    batchNumber: row.batch_number,
    supplier: row.supplier,
    samplingMethod: row.sampling_method as FieldReport['samplingMethod'],
    notes: row.notes ?? undefined,
    status: row.status as FieldReport['status'],
    attachments: row.report_attachments.map((a) => a.file_url),
    photoDataUri: row.photo_url ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    aiIsAnomalous: row.ai_is_anomalous ?? undefined,
    aiAnomalyExplanation: row.ai_anomaly_explanation ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchAll(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  orgId?: string
): Promise<FieldReport[]> {
  let query = supabase
    .from('reports')
    .select('*, report_attachments(file_url)')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as ReportRow[]).map(mapRowToFieldReport);
}

async function fetchByTechnician(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  technicianId: string
): Promise<FieldReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, report_attachments(file_url)')
    .eq('technician_id', technicianId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ReportRow[]).map(mapRowToFieldReport);
}

export function getReportsSubscription(
  orgId: string | null | undefined,
  onUpdate: (reports: FieldReport[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const supabase = createSupabaseBrowserClient();

  fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);

  const channelFilter = orgId ? { filter: `organization_id=eq.${orgId}` } : {};

  const channel = supabase
    .channel(`reports-all-${orgId ?? 'global'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports', ...channelFilter }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_attachments' }, () => {
      fetchAll(supabase, orgId ?? undefined).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

async function fetchByProject(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  projectId: string
): Promise<FieldReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, report_attachments(file_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ReportRow[]).map(mapRowToFieldReport);
}

export function getReportsByProjectIdSubscription(
  projectId: string,
  onUpdate: (reports: FieldReport[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!projectId) {
    onError(new Error('Project ID is required for subscription.'));
    return () => {};
  }

  const supabase = createSupabaseBrowserClient();

  fetchByProject(supabase, projectId).then(onUpdate).catch(onError);

  const channel = supabase
    .channel(`reports-project-${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports', filter: `project_id=eq.${projectId}` },
      () => { fetchByProject(supabase, projectId).then(onUpdate).catch(onError); }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function getReportsByTechnicianIdSubscription(
  technicianId: string,
  onUpdate: (reports: FieldReport[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!technicianId) {
    onError(new Error('Technician ID is required for subscription.'));
    return () => {};
  }

  const supabase = createSupabaseBrowserClient();

  fetchByTechnician(supabase, technicianId).then(onUpdate).catch(onError);

  const channel = supabase
    .channel(`reports-technician-${technicianId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports', filter: `technician_id=eq.${technicianId}` },
      () => { fetchByTechnician(supabase, technicianId).then(onUpdate).catch(onError); }
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_attachments' }, () => {
      fetchByTechnician(supabase, technicianId).then(onUpdate).catch(onError);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
