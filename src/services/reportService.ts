
'use server';

import { db } from '@/lib/firebase';
import type { FieldReport } from '@/lib/types';
import { collection, getDocs, Timestamp, query, where, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, type FirestoreError } from 'firebase/firestore';
import { addNotification } from './notificationService';

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
    rejectionReason: data.rejectionReason || undefined,
    aiIsAnomalous: data.aiIsAnomalous === undefined ? undefined : data.aiIsAnomalous,
    aiAnomalyExplanation: data.aiAnomalyExplanation || undefined,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
};

export async function getReports(): Promise<FieldReport[]> {
  try {
    const reportsCollectionRef = collection(db, 'reports');
    const q = query(reportsCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const reports: FieldReport[] = querySnapshot.docs.map(mapDocToFieldReport);
    return reports;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    if (firestoreError.code === 'failed-precondition') {
      console.warn(
        `[Service/getReports] La requête Firestore pour tous les rapports (triés par createdAt) a échoué en raison d'un index manquant. Message Firebase : ${firestoreError.message}. Veuillez créer l'index requis dans votre console Firebase. Retour d'un tableau vide pour l'instant.`
      );
      const match = firestoreError.message.match(/(https:\/\/[^\s]+)/);
      if (match && match[0]) {
        console.warn(`[Service/getReports] Lien de création d'index : ${match[0]}`);
      }
      return []; 
    }
    console.error("[Service/getReports] Erreur lors de la récupération de tous les rapports : ", firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de la récupération des rapports depuis la base de données. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}. Vérifiez les journaux du serveur et les index Firestore.`);
  }
}

export async function getReportsByTechnicianId(technicianId: string): Promise<FieldReport[]> {
  if (!technicianId) {
    console.warn("[Service/getReportsByTechnicianId] Appelé sans technicianId. Retour d'un tableau vide.");
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
    
    const reports: FieldReport[] = querySnapshot.docs.map(docSnapshot => {
        const report = mapDocToFieldReport(docSnapshot);
        return report;
    });
    return reports;
  } catch (error) {
    const firestoreError = error as FirestoreError;
     if (firestoreError.code === 'failed-precondition') {
      console.warn(
        `[Service/getReportsByTechnicianId] La requête Firestore pour les rapports du technicien "${technicianId}" (où technicianId et trié par createdAt) a échoué en raison d'un index composite manquant. Message Firebase : ${firestoreError.message}. Veuillez créer l'index requis dans votre console Firebase. Retour d'un tableau vide pour l'instant.`
      );
      const match = firestoreError.message.match(/(https:\/\/[^\s]+)/);
      if (match && match[0]) {
        console.warn(`[Service/getReportsByTechnicianId] Lien de création d'index : ${match[0]}`);
      }
      return []; 
    }
    console.error(`[Service/getReportsByTechnicianId] Erreur lors de la récupération des rapports pour le technicien ${technicianId}: `, firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de la récupération des rapports pour le technicien ${technicianId}. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}. Vérifiez les journaux du serveur et les index Firestore.`);
  }
}

export async function getReportById(reportId: string): Promise<FieldReport | null> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    const docSnap = await getDoc(reportDocRef);

    if (docSnap.exists()) {
      return mapDocToFieldReport(docSnap);
    } else {
      return null;
    }
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`[Service/getReportById] Erreur lors de la récupération du rapport par ID ${reportId}: `, firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de la récupération du rapport ${reportId} depuis la base de données. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}


export async function addReport(
  reportData: Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const reportsCollectionRef = collection(db, 'reports');
    const reportPayload = {
      ...reportData,
      rejectionReason: reportData.rejectionReason || null, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(reportsCollectionRef, reportPayload);
    return docRef.id;
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error("[Service/addReport] Erreur lors de l'ajout du rapport : ", firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de l'ajout du rapport à la base de données. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

export async function updateReport(
  reportId: string,
  reportData: Partial<Omit<FieldReport, 'id' | 'createdAt' | 'updatedAt' | 'technicianId' | 'projectId'>>
): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    
    const currentReportSnap = await getDoc(reportDocRef);
    if (!currentReportSnap.exists()) {
      throw new Error(`Rapport avec ID ${reportId} non trouvé.`);
    }
    const currentReportData = currentReportSnap.data() as FieldReport;
    const technicianId = currentReportData.technicianId;
    const projectId = currentReportData.projectId;

    const updatePayload: any = { ...reportData };

    if (reportData.photoDataUri === undefined && Object.prototype.hasOwnProperty.call(reportData, 'photoDataUri')) {
      updatePayload.photoDataUri = null; 
    }
    
    if (reportData.status && reportData.status !== 'REJECTED') {
      updatePayload.rejectionReason = null;
    } else if (Object.prototype.hasOwnProperty.call(reportData, 'rejectionReason')) {
      updatePayload.rejectionReason = reportData.rejectionReason || null;
    }
    
    if (Object.prototype.hasOwnProperty.call(reportData, 'aiIsAnomalous') && reportData.aiIsAnomalous === undefined) {
      updatePayload.aiIsAnomalous = null;
    }
    if (Object.prototype.hasOwnProperty.call(reportData, 'aiAnomalyExplanation') && reportData.aiAnomalyExplanation === undefined) {
      updatePayload.aiAnomalyExplanation = null;
    }

    await updateDoc(reportDocRef, {
      ...updatePayload,
      updatedAt: serverTimestamp(),
    });

    if (technicianId && reportData.status) {
      if (reportData.status === 'VALIDATED') {
        await addNotification(technicianId, {
          type: 'report_update',
          message: `Votre rapport #${reportId.substring(0,6)}... pour le projet PJT-${projectId.substring(0,4)}... a été VALIDÉ.`,
          targetId: reportId,
          link: `/reports/view/${reportId}`,
        });
      } else if (reportData.status === 'REJECTED') {
        const reason = reportData.rejectionReason || "Aucune raison spécifique fournie.";
        await addNotification(technicianId, {
          type: 'report_update',
          message: `Votre rapport #${reportId.substring(0,6)}... pour le projet PJT-${projectId.substring(0,4)}... a été REJETÉ. Raison : ${reason}`,
          targetId: reportId,
          link: `/reports/edit/${reportId}`,
        });
      }
    }

  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`[Service/updateReport] Erreur lors de la mise à jour du rapport ${reportId}: `, firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de la mise à jour du rapport ${reportId} dans la base de données. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  try {
    const reportDocRef = doc(db, 'reports', reportId);
    await deleteDoc(reportDocRef);
  } catch (error) {
    const firestoreError = error as FirestoreError;
    console.error(`[Service/deleteReport] Erreur lors de la suppression du rapport ${reportId}: `, firestoreError.code, firestoreError.message, firestoreError);
    throw new Error(`Échec de la suppression du rapport ${reportId} de la base de données. Erreur Firebase : ${firestoreError.code} - ${firestoreError.message}.`);
  }
}
