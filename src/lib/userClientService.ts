// This file is for client-side user utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import {
  collection,
  doc,
  query,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
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

const mapDocToUser = (docSnapshot: any): User => {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed User',
        email: data.email || 'no-email@example.com',
        role: data.role || 'TECHNICIAN',
        avatarUrl: data.avatarUrl || undefined,
        assignments: Array.isArray(data.assignments) ? data.assignments : [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
    } as User;
};

/**
 * Subscribes to real-time updates for all users.
 * @param onUpdate - Callback function to handle the updated users list.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function getUsersSubscription(onUpdate: (users: User[]) => void, onError: (error: Error) => void): Unsubscribe {
  const usersCollectionRef = collection(db, 'users');
  const q = query(usersCollectionRef);

  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(mapDocToUser);
    onUpdate(users);
  }, (error) => {
    console.error("Error with users real-time subscription:", error);
    onError(new Error("Failed to subscribe to users updates."));
  });
}


/**
 * Subscribes to real-time updates for a single user.
 * @param userId - The ID of the user to subscribe to.
 * @param onUpdate - Callback function to handle the updated user data.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function getUserByIdSubscription(userId: string, onUpdate: (user: User | null) => void, onError: (error: Error) => void): Unsubscribe {
  const userDocRef = doc(db, 'users', userId);

  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(mapDocToUser(docSnap));
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error(`Error with user real-time subscription for ID ${userId}:`, error);
    onError(new Error(`Failed to subscribe to user updates for ID ${userId}.`));
  });
}
