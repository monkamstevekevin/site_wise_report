
// This file is for client-side notification utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { Notification } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
  type FirestoreError,
} from 'firebase/firestore';

const formatTimestamp = (timestampField: any): string => {
  if (!timestampField) {
    return new Date().toISOString();
  }
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  if (timestampField.seconds !== undefined && typeof timestampField.nanoseconds === 'number') {
    return new Timestamp(timestampField.seconds, timestampField.nanoseconds).toDate().toISOString();
  }
  if (typeof timestampField === 'string' || typeof timestampField === 'number') {
    const date = new Date(timestampField);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
};

const mapDocToNotification = (doc: DocumentData): Notification => {
  const data = doc.data();
  return {
    id: doc.id,
    message: data.message || 'No message content.',
    type: data.type || 'generic',
    isRead: data.isRead || false,
    targetId: data.targetId,
    link: data.link,
    createdAt: formatTimestamp(data.createdAt),
  };
};

/**
 * Subscribes to real-time updates for a user's notifications.
 * This function is intended for client-side use.
 * @param {string} userId The ID of the user whose notifications are to be fetched.
 * @param {(notifications: Notification[]) => void} onUpdate Callback function invoked with the array of notifications.
 * @param {number} [limitCount=15] The maximum number of notifications to fetch.
 * @returns {Unsubscribe} A function to unsubscribe from the real-time updates.
 */
export function getNotificationsSubscription(
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  limitCount: number = 15
): Unsubscribe {
  if (!userId) {
    console.warn("[NotificationClientService] User ID is required for notifications subscription. Returning no-op unsubscribe.");
    onUpdate([]);
    return () => {}; // No-op unsubscribe
  }

  const notificationsCollectionRef = collection(db, 'users', userId, 'notifications');
  const q = query(notificationsCollectionRef, orderBy('createdAt', 'desc'), limit(limitCount));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const notifications: Notification[] = querySnapshot.docs.map(mapDocToNotification);
      onUpdate(notifications);
    },
    (error: FirestoreError) => {
      console.error(`[NotificationClientService] Error fetching real-time notifications for user ${userId}: `, error);
      if (error.code === 'failed-precondition') {
         console.warn(
          `[NotificationClientService] Firestore query for user "${userId}" notifications failed due to a missing index. Message: ${error.message}. Please create the required composite index (e.g., on 'createdAt' desc) in your Firebase console for the 'notifications' subcollection within 'users'.`
        );
        const match = error.message.match(/(https:\/\/[^\s]+)/);
        if (match && match[0]) {
            console.warn(`[NotificationClientService] Create Index Link: ${match[0]}`);
        }
      }
      // Optionally notify UI about the error or clear notifications
      // onUpdate([]); 
    }
  );

  return unsubscribe;
}
