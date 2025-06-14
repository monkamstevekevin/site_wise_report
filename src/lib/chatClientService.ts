// This file is for client-side chat utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { ChatMessage } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
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
 * Subscribes to real-time updates for chat messages of a specific project.
 * This function is intended for client-side use.
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
    console.warn("[ChatClientService] Project ID is required for messages subscription. Returning no-op unsubscribe.");
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
      console.error(`[ChatClientService] Error fetching real-time chat messages for project ${projectId}: `, error);
      if (error.code === 'failed-precondition') {
         console.warn(
          `[ChatClientService] Firestore query for project "${projectId}" chat messages failed due to a missing index. Message: ${error.message}. Please create the required composite index (e.g., on 'timestamp' for ordering) in your Firebase console for the 'chatMessages' subcollection.`
        );
        const match = error.message.match(/(https:\/\/[^\s]+)/);
        if (match && match[0]) {
            console.warn(`[ChatClientService] Create Index Link: ${match[0]}`);
        }
      }
    }
  );

  return unsubscribe;
}
