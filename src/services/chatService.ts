
'use server';

import { db } from '@/lib/firebase';
import type { ChatMessage, NewChatMessagePayload } from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type Unsubscribe,
  type FirestoreError,
} from 'firebase/firestore';

/**
 * @fileOverview Chat service for interacting with Firestore chat messages.
 *
 * - addChatMessage - Adds a new chat message to a project's chat.
 * - getChatMessagesSubscription - Subscribes to real-time updates for a project's chat messages.
 */

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

const mapDocToChatMessage = (doc: DocumentData, currentUserId?: string): ChatMessage => {
  const data = doc.data();
  const message = {
    id: doc.id,
    projectId: data.projectId,
    senderId: data.senderId,
    senderName: data.senderName || 'Unknown User',
    senderAvatar: data.senderAvatar,
    text: data.text,
    imageUrl: data.imageUrl, // Will be null if not persisted
    timestamp: formatTimestamp(data.timestamp),
  } as ChatMessage;

  if (currentUserId) {
    message.isOwnMessage = data.senderId === currentUserId;
  }
  return message;
};

/**
 * Adds a new chat message to the 'chatMessages' subcollection of a project.
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
      imageUrl: messageData.imageUrl || null, // Ensure imageUrl is null if not provided
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`Error adding chat message to project ${projectId}: `, firestoreError);
    throw new Error(`Failed to send message. Firebase Error: ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

/**
 * Subscribes to real-time updates for chat messages of a specific project.
 * @param {string} projectId The ID of the project.
 * @param {(messages: ChatMessage[]) => void} onMessagesUpdate Callback function invoked with the array of messages.
 * @param {string} currentUserId Optional. The ID of the current user to determine if a message is their own.
 * @returns {Unsubscribe} A function to unsubscribe from the real-time updates.
 */
export function getChatMessagesSubscription(
  projectId: string,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  currentUserId?: string
): Unsubscribe {
  if (!projectId) {
    console.warn("[ChatService] Project ID is required for messages subscription. Returning no-op unsubscribe.");
    onMessagesUpdate([]);
    return () => {}; // No-op unsubscribe
  }

  const chatMessagesCollectionRef = collection(db, 'projects', projectId, 'chatMessages');
  const q = query(chatMessagesCollectionRef, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const messages: ChatMessage[] = querySnapshot.docs.map(doc => mapDocToChatMessage(doc, currentUserId));
      onMessagesUpdate(messages);
    },
    (error: FirestoreError) => {
      console.error(`Error fetching real-time chat messages for project ${projectId}: `, error);
      // Optionally, notify the UI about the error
      // onMessagesUpdate([]); // Or pass an error state up
      if (error.code === 'failed-precondition') {
         console.warn(
          `[ChatService] Firestore query for project "${projectId}" chat messages failed due to a missing index. Message: ${error.message}. Please create the required composite index (e.g., on 'timestamp' for ordering) in your Firebase console for the 'chatMessages' subcollection.`
        );
        const match = error.message.match(/(https:\/\/[^\s]+)/);
        if (match && match[0]) {
            console.warn(`[ChatService] Create Index Link: ${match[0]}`);
        }
      }
    }
  );

  return unsubscribe;
}
