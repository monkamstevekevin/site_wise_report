
'use server';

import { db } from '@/lib/firebase';
import type { FieldReport } from '@/lib/types';
import { collection, getDocs, Timestamp, query, where, orderBy } from 'firebase/firestore';

/**
 * @fileOverview Report service for interacting with Firestore.
 *
 * - getReports - Fetches all reports from Firestore, ordered by creation date (desc).
 * - getReportsByTechnicianId - Fetches reports for a specific technician, ordered by creation date (desc).
 * - formatTimestamp - Utility to format Firestore Timestamps.
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
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
};

/**
 * Fetches all reports from the 'reports' collection in Firestore.
 * Ordered by creation date in descending order.
 * @returns {Promise<FieldReport[]>} A promise that resolves to an array of FieldReport objects.
 * @throws Will throw an error if fetching reports fails.
 */
export async function getReports(): Promise<FieldReport[]> {
  try {
    const reportsCollectionRef = collection(db, 'reports');
    const q = query(reportsCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const reports: FieldReport[] = querySnapshot.docs.map(mapDocToFieldReport);
    return reports;
  } catch (error) {
    console.error("Error fetching all reports: ", error);
    throw new Error("Failed to fetch reports from database. Check server logs for Firebase error details.");
  }
}

/**
 * Fetches all reports for a specific technician ID from the 'reports' collection in Firestore.
 * Ordered by creation date in descending order.
 * @param {string} technicianId The ID of the technician whose reports are to be fetched.
 * @returns {Promise<FieldReport[]>} A promise that resolves to an array of FieldReport objects.
 * @throws Will throw an error if fetching reports fails.
 */
export async function getReportsByTechnicianId(technicianId: string): Promise<FieldReport[]> {
  if (!technicianId) {
    console.warn("getReportsByTechnicianId called without a technicianId.");
    return [];
  }
  try {
    const reportsCollectionRef = collection(db, 'reports');
    const q = query(
      reportsCollectionRef,
      where('technicianId', '==', technicianId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const reports: FieldReport[] = querySnapshot.docs.map(mapDocToFieldReport);
    return reports;
  } catch (error) {
    console.error(`Error fetching reports for technician ${technicianId}: `, error);
    throw new Error(`Failed to fetch reports for technician ${technicianId}. Check server logs.`);
  }
}
