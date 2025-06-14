
'use server';

import { db } from '@/lib/firebase';
import type { FieldReport } from '@/lib/types';
import { collection, getDocs, Timestamp, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

/**
 * @fileOverview Report service for interacting with Firestore.
 *
 * - getReports - Fetches all reports from Firestore, ordered by creation date (desc).
 * - getReportsByTechnicianId - Fetches reports for a specific technician, ordered by creation date (desc).
 * - getReportById - Fetches a single report by its ID.
 * - addReport - Adds a new report to Firestore.
 * - updateReport - Updates an existing report in Firestore.
 * - deleteReport - Deletes a report from Firestore.
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

/**
 * Fetches a single report by its ID from Firestore.
 * @param {string} reportId The ID of the report to fetch.
 * @returns {Promise<FieldReport | null>} A promise that resolves to the FieldReport object or null if not found.
 */
export async function getReportById(reportId: string): Promise<FieldReport | null> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(reportDocRef);

    if (docSnap.exists()) {
      return mapDocToFieldReport(docSnap);
    } else {
      console.log("No such report document with ID:", reportId);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching report by ID ${reportId}: `, error);
    throw new Error(`Failed to fetch report ${reportId} from database.`);
  }
}


/**
 * Adds a new report to the 'reports' collection in Firestore.
 * @param reportData The data for the new report, excluding id, createdAt, and updatedAt.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created report.
 * @throws Will throw an error if adding the report fails.
 */
export async function addReport(
  reportData: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const reportsCollectionRef = collection(db, 'reports');
    const reportPayload = {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(reportsCollectionRef, reportPayload);
    return docRef.id;
  } catch (error) {
    console.error("Error adding report: ", error);
    throw new Error("Failed to add report to database. Check server logs for details.");
  }
}

/**
 * Updates an existing report in Firestore.
 * @param {string} reportId The ID of the report to update.
 * @param {Partial<Omit<FieldReport, 'id' | 'createdAt' | 'technicianId' | 'projectId'>>} reportData The data to update. `technicianId` and `projectId` are not updatable here.
 * @returns {Promise<void>} A promise that resolves when the report is successfully updated.
 * @throws Will throw an error if updating the report fails.
 */
export async function updateReport(
  reportId: string,
  reportData: Partial<Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'projectId'>>
): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    
    const updatePayload: any = { ...reportData };
    if (reportData.photoDataUri === undefined && reportData.hasOwnProperty('photoDataUri')) {
      // This means the photo was explicitly removed in the form
      // We can set it to null or use deleteField if necessary, 
      // but for simplicity, we'll ensure it can be set to undefined or null
      updatePayload.photoDataUri = null; // Or undefined, depending on how Firestore handles it
    }


    await updateDoc(reportDocRef, {
      ...updatePayload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating report ${reportId}: `, error);
    throw new Error(`Failed to update report ${reportId} in database.`);
  }
}

/**
 * Deletes a report from Firestore.
 * @param {string} reportId The ID of the report to delete.
 * @returns {Promise<void>} A promise that resolves when the report is successfully deleted.
 * @throws Will throw an error if deleting the report fails.
 */
export async function deleteReport(reportId: string): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    console.error(`Error deleting report ${reportId}: `, error);
    throw new Error(`Failed to delete report ${reportId} from database.`);
  }
}
