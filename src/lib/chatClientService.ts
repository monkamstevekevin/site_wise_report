// Client-side chat subscriptions using Supabase Realtime
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ChatMessage } from '@/lib/types';

type Unsubscribe = () => void;

type ChatMessageRow = {
  id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  text: string | null;
  image_url: string | null;
  timestamp: string;
};

function mapRowToChatMessage(row: ChatMessageRow, currentUserId?: string): ChatMessage {
  return {
    id: row.id,
    projectId: row.project_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar ?? undefined,
    text: row.text ?? undefined,
    imageUrl: row.image_url ?? undefined,
    timestamp: row.timestamp,
    isOwnMessage: currentUserId ? row.sender_id === currentUserId : undefined,
  };
}

async function fetchByProject(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  projectId: string,
  currentUserId?: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('timestamp', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ChatMessageRow[]).map((row) => mapRowToChatMessage(row, currentUserId));
}

export function getChatMessagesSubscription(
  projectId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  currentUserId?: string
): Unsubscribe {
  if (!projectId) {
    onMessagesUpdate([]);
    return () => {};
  }

  const supabase = createSupabaseBrowserClient();

  fetchByProject(supabase, projectId, currentUserId).then(onMessagesUpdate).catch((e) => {
    console.error(`[ChatClientService] Error fetching messages for project ${projectId}:`, e);
  });

  const channel = supabase
    .channel(`chat-${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `project_id=eq.${projectId}` },
      () => {
        fetchByProject(supabase, projectId, currentUserId).then(onMessagesUpdate).catch((e) => {
          console.error(`[ChatClientService] Error refetching messages for project ${projectId}:`, e);
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
