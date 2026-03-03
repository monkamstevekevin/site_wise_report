// This file is for client-side report utilities, specifically for real-time subscriptions.
import { db } from '@/lib/firebase';
import type { FieldReport } from '@/lib/types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type FirestoreError,
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

const mapDocToFieldReport = (docSnapshot: any): FieldReport => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    projectId: data.projectId || 'N/A',
    technicianId: data.technicianId || 'N/A',
    materialType: data.materialType || 'other',
    temperature: typeof data.temperature === 'number' ? data.temperature : 0,
    volume: typeof data.volume === 'number' ? data.volume : 0,
    density: typeof data.density === 'number' ? data.density : 0,
    humidity: typeof data.humidity === 'number' ? data.humidity : 0,
    batchNumber: data.batchNumber || 'N/A',
    supplier: data.supplier || 'N/A',
    samplingMethod: data.samplingMethod || 'other',
    notes: data.notes || '',
    status: data.status || 'DRAFT',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    photoDataUri: data.photoDataUri || undefined,
    rejectionReason: data.rejectionReason || undefined,
    aiIsAnomalous: data.aiIsAnomalous === undefined ? undefined : data.aiIsAnomalous,
    aiAnomalyExplanation: data.aiAnomalyExplanation || undefined,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
};

export function getReportsSubscription(onUpdate: (reports: FieldReport[]) => void, onError: (error: Error) => void): Unsubscribe {
  const reportsCollectionRef = collection(db, 'reports');
  const q = query(reportsCollectionRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    onUpdate(querySnapshot.docs.map(mapDocToFieldReport));
  }, (error) => {
    console.error("Error with all reports real-time subscription:", error);
    onError(new Error("Failed to subscribe to all reports."));
  });
}

export function getReportsByTechnicianIdSubscription(technicianId: string, onUpdate: (reports: FieldReport[]) => void, onError: (error: Error) => void): Unsubscribe {
    if (!technicianId) {
        onError(new Error("Technician ID is required for subscription."));
        return () => {};
    }
    const reportsCollectionRef = collection(db, 'reports');
    const q = query(reportsCollectionRef, where('technicianId', '==', technicianId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (querySnapshot) => {
        onUpdate(querySnapshot.docs.map(mapDocToFieldReport));
    }, (error) => {
        console.error(`Error with technician reports real-time subscription for ${technicianId}:`, error);
        onError(new Error(`Failed to subscribe to reports for technician ${technicianId}.`));
    });
}
