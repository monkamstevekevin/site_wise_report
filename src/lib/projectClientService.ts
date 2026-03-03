// This file is for client-side project utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
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

const mapDocToProject = (docSnapshot: any): Project => {
    const data = docSnapshot.data();
    return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed Project',
        location: data.location || 'Unknown Location',
        description: data.description || '',
        status: data.status || 'INACTIVE',
        startDate: data.startDate,
        endDate: data.endDate,
        assignedMaterialIds: data.assignedMaterialIds || [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
    } as Project;
};

/**
 * Subscribes to real-time updates for all projects.
 * @param onUpdate - Callback function to handle the updated projects list.
 * @returns An unsubscribe function to stop listening for updates.
 */
export function getProjectsSubscription(onUpdate: (projects: Project[]) => void, onError: (error: Error) => void): Unsubscribe {
  const projectsCollectionRef = collection(db, 'projects');
  const q = query(projectsCollectionRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const projects = querySnapshot.docs.map(mapDocToProject);
    onUpdate(projects);
  }, (error) => {
    console.error("Error with projects real-time subscription:", error);
    onError(new Error("Failed to subscribe to projects updates."));
  });
}
