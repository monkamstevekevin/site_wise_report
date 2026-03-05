'use server';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewNotificationPayload, NotificationType } from '@/lib/types';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function addNotification(
  userId: string,
  notificationData: NewNotificationPayload
): Promise<string> {
  if (!userId) throw new Error("L'ID utilisateur est requis pour ajouter une notification.");

  const [created] = await db
    .insert(notifications)
    .values({
      userId,
      type: notificationData.type as NotificationType,
      message: notificationData.message,
      targetId: notificationData.targetId ?? null,
      link: notificationData.link ?? null,
      isRead: false,
    })
    .returning({ id: notifications.id });

  return created.id;
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) throw new Error("ID utilisateur et ID notification requis.");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) throw new Error("L'ID utilisateur est requis.");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) throw new Error("ID utilisateur et ID notification requis pour la suppression.");

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
