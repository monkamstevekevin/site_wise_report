
'use server'; // Explicitly mark this for Server Actions

import { db } from '@/lib/firebase';
import type { NewChatMessagePayload } from '@/lib/types';
import {
  collection,
  addDoc,
  serverTimestamp,
  type FirestoreError,
} from 'firebase/firestore';

/**
 * @fileOverview Chat service for server-side chat operations.
 *
 * - addChatMessage - Adds a new chat message to a project's chat (Server Action).
 */

/**
 * Adds a new chat message to the 'chatMessages' subcollection of a project.
 * This is a Server Action.
 * @param {string} projectId The ID of the project.
 * @param {NewChatMessagePayload} messageData The data for the new message.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created message.
 * @throws Will throw an error if adding the message fails.
 */
export async function addChatMessage(
  projectId: string,
  messageData: NewChatMessagePayload
): Promise<string> {
  if (!projectId) {
    throw new Error('Project ID is required to add a chat message.');
  }
  try {
    const chatMessagesCollectionRef = collection(db, 'projects', projectId, 'chatMessages');
    const docRef = await addDoc(chatMessagesCollectionRef, {
      ...messageData,
      imageUrl: messageData.imageUrl || null,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Error adding chat message to project ${projectId}: `, firestoreError);
    throw new Error(`Failed to send message. Firebase Error: ${firestoreError.code} - ${firestoreError.message}.`);
  }
}
