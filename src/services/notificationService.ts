
'use server';

import { db } from '@/lib/firebase';
import type { NewNotificationPayload, Notification } from '@/lib/types';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
  Timestamp,
  type FirestoreError
} from 'firebase/firestore';

/**
 * @fileOverview Notification service for server-side notification operations.
 *
 * - addNotification - Adds a new notification to a user's subcollection.
 * - markNotificationAsRead - Marks a specific notification as read.
 * - markAllNotificationsAsRead - Marks all of a user's notifications as read.
 */

/**
 * Adds a new notification to the 'notifications' subcollection of a user.
 * @param {string} userId The ID of the user for whom the notification is intended.
 * @param {NewNotificationPayload} notificationData The data for the new notification.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created notification.
 * @throws Will throw an error if adding the notification fails.
 */
export async function addNotification(
  userId: string,
  notificationData: NewNotificationPayload
): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to add a notification.');
  }
  try {
    const notificationsCollectionRef = collection(db, 'users', userId, 'notifications');
    const docRef = await addDoc(notificationsCollectionRef, {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Error adding notification for user ${userId}: `, firestoreError);
    throw new Error(`Failed to add notification. Firebase Error: ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

/**
 * Marks a specific notification as read for a user.
 * @param {string} userId The ID of the user.
 * @param {string} notificationId The ID of the notification to mark as read.
 * @returns {Promise<void>}
 * @throws Will throw an error if updating the notification fails.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) {
    throw new Error('User ID and Notification ID are required.');
  }
  try {
    const notificationDocRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationDocRef, {
      isRead: true,
    });
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Error marking notification ${notificationId} as read for user ${userId}: `, firestoreError);
    throw new Error(`Failed to mark notification as read. Firebase Error: ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

/**
 * Marks all unread notifications as read for a user.
 * @param {string} userId The ID of the user.
 * @returns {Promise<void>}
 * @throws Will throw an error if updating notifications fails.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required.');
  }
  try {
    const notificationsCollectionRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsCollectionRef, where('isRead', '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return; // No unread notifications to mark
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnapshot => {
      batch.update(docSnapshot.ref, { isRead: true });
    });
    await batch.commit();
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Error marking all notifications as read for user ${userId}: `, firestoreError);
    throw new Error(`Failed to mark all notifications as read. Firebase Error: ${firestoreError.code} - ${firestoreError.message}.`);
  }
}
