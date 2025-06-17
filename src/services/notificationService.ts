
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
  deleteDoc, // Import deleteDoc
  type FirestoreError
} from 'firebase/firestore';

/**
 * @fileOverview Notification service for server-side notification operations.
 *
 * - addNotification - Adds a new notification to a user's subcollection.
 * - markNotificationAsRead - Marks a specific notification as read.
 * - markAllNotificationsAsRead - Marks all of a user's notifications as read.
 * - deleteNotification - Deletes a specific notification for a user.
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
    throw new Error('L\'ID utilisateur est requis pour ajouter une notification.');
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
    console.error(`Erreur lors de l'ajout de la notification pour l'utilisateur ${userId}: `, firestoreError);
    throw new Error(`Échec de l'ajout de la notification. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
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
    throw new Error('L\'ID utilisateur et l\'ID de notification sont requis.');
  }
  try {
    const notificationDocRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationDocRef, {
      isRead: true,
    });
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Erreur lors de la mise à jour de la notification ${notificationId} comme lue pour l'utilisateur ${userId}: `, firestoreError);
    throw new Error(`Échec de la mise à jour de la notification comme lue. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
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
    throw new Error('L\'ID utilisateur est requis.');
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
    console.error(`Erreur lors de la mise à jour de toutes les notifications comme lues pour l'utilisateur ${userId}: `, firestoreError);
    throw new Error(`Échec de la mise à jour de toutes les notifications comme lues. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

/**
 * Deletes a specific notification for a user.
 * @param {string} userId The ID of the user.
 * @param {string} notificationId The ID of the notification to delete.
 * @returns {Promise<void>}
 * @throws Will throw an error if deleting the notification fails.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) {
    throw new Error('L\'ID utilisateur et l\'ID de notification sont requis pour la suppression.');
  }
  try {
    const notificationDocRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(notificationDocRef);
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Erreur lors de la suppression de la notification ${notificationId} pour l'utilisateur ${userId}: `, firestoreError);
    throw new Error(`Échec de la suppression de la notification. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}
