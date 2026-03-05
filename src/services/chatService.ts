'use server';

import { db } from '@/db';
import { chatMessages } from '@/db/schema';
import type { NewChatMessagePayload } from '@/lib/types';

export async function addChatMessage(
  projectId: string,
  messageData: NewChatMessagePayload
): Promise<string> {
  if (!projectId) throw new Error("L'ID du projet est requis pour envoyer un message.");

  const [created] = await db
    .insert(chatMessages)
    .values({
      projectId,
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar ?? null,
      text: messageData.text ?? null,
      imageUrl: messageData.imageUrl ?? null,
    })
    .returning({ id: chatMessages.id });

  return created.id;
}
