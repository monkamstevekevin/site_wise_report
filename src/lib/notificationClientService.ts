// Client-side notification subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

type Unsubscribe = () => void;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  message: string;
  target_id: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function mapRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type as Notification['type'],
    message: row.message,
    isRead: row.is_read,
    targetId: row.target_id ?? undefined,
    link: row.link ?? undefined,
    createdAt: row.created_at,
  };
}

async function fetchByUser(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  limitCount: number
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount);
  if (error) throw new Error(error.message);
  return (data as NotificationRow[]).map(mapRowToNotification);
}

export function getNotificationsSubscription(
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  limitCount: number = 15
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const supabase = createSupabaseBrowserClient();

  fetchByUser(supabase, userId, limitCount).then(onUpdate).catch((e) => {
    console.error(`[NotificationClientService] Error fetching notifications for user ${userId}:`, e);
  });

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      () => {
        fetchByUser(supabase, userId, limitCount).then(onUpdate).catch((e) => {
          console.error(`[NotificationClientService] Error refetching notifications for user ${userId}:`, e);
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
