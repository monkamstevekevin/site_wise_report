// This file is for client-side material utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { Material } from '@/lib/types';
import {
  collection,
  query,
  orderBy,
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

const mapDocToMaterial = (docSnapshot: any): Material => {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed Material',
        type: data.type || 'other',
        validationRules: data.validationRules || {},
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
    } as Material;
};

/**
 * Subscribes to real-time updates for all materials.
 * @param onUpdate - Callback function to handle the updated materials list.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function getMaterialsSubscription(onUpdate: (materials: Material[]) => void, onError: (error: Error) => void): Unsubscribe {
  const materialsCollectionRef = collection(db, 'materials');
  const q = query(materialsCollectionRef, orderBy('name'));

  return onSnapshot(q, (querySnapshot) => {
    const materials = querySnapshot.docs.map(mapDocToMaterial);
    onUpdate(materials);
  }, (error) => {
    console.error("Error with materials real-time subscription:", error);
    onError(new Error("Failed to subscribe to materials updates."));
  });
}
