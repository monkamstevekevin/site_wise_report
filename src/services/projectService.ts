
'use server';

import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy, addDoc, serverTimestamp, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import type { ProjectSubmitData } from '@/app/(app)/admin/projects/components/ProjectFormDialog';


/**
 * @fileOverview Project service for interacting with Firestore.
 *
 * - getProjects - Fetches all projects from Firestore.
 * - getProjectById - Fetches a single project by its ID from Firestore.
 * - addProject - Adds a new project to Firestore.
 * - updateProject - Updates an existing project in Firestore.
 * - deleteProject - Deletes a project from Firestore.
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

/**
 * Fetches all projects from the 'projects' collection in Firestore.
 * @returns {Promise<Project[]>} A promise that resolves to an array of Project objects.
 * @throws Will throw an error if fetching projects fails.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    const q = query(projectsCollectionRef, orderBy('createdAt', 'desc')); 
    const querySnapshot = await getDocs(q);
    
    const projects: Project[] = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed Project',
        location: data.location || 'Unknown Location',
        description: data.description || '',
        status: data.status || 'INACTIVE',
        startDate: data.startDate, // Firestore stores it as string if it was string
        endDate: data.endDate,     // Firestore stores it as string if it was string
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Project; 
    });
    return projects;
  } catch (error: any) {
    console.error("Error fetching projects (see details below): ", error);
    if (error.code === 'failed-precondition') {
      console.warn(`[Service/getProjects] Firestore query for projects (orderBy createdAt) failed due to a missing index. Firebase message: ${error.message}. Please create the required index in your Firebase console. Returning empty array for now.`);
      const match = error.message.match(/(https:\/\/[^\s]+)/);
      if (match && match[0]) {
          console.warn(`[Service/getProjects] Create Index Link: ${match[0]}`);
      }
      return []; // Return empty or handle as appropriate for your UI
    }
    throw new Error("Failed to fetch projects from database. Check server logs for Firebase error details.");
  }
}

/**
 * Fetches a single project by its ID from Firestore.
 * @param {string} projectId The ID of the project to fetch.
 * @returns {Promise<Project | null>} A promise that resolves to the Project object or null if not found.
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const projectDocRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(projectDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || 'Unnamed Project',
        location: data.location || 'Unknown Location',
        description: data.description || '',
        status: data.status || 'INACTIVE',
        startDate: data.startDate,
        endDate: data.endDate,
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Project;
    } else {
      console.log("No such project document with ID:", projectId);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching project by ID ${projectId}: `, error);
    throw new Error(`Failed to fetch project ${projectId} from database.`);
  }
}

/**
 * Adds a new project to the 'projects' collection in Firestore.
 * @param {ProjectSubmitData} projectData The data for the new project.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created project.
 * @throws Will throw an error if adding the project fails.
 */
export async function addProject(projectData: ProjectSubmitData): Promise<string> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    const dataToSave: any = {
      ...projectData,
      startDate: projectData.startDate || null, // Store as null if undefined
      endDate: projectData.endDate || null,     // Store as null if undefined
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(projectsCollectionRef, dataToSave);
    return docRef.id;
  } catch (error) {
    console.error("Error adding project: ", error);
    throw new Error("Failed to add project to database.");
  }
}

/**
 * Updates an existing project in Firestore.
 * @param {string} projectId The ID of the project to update.
 * @param {Partial<ProjectSubmitData>} projectData The data to update.
 * @returns {Promise<void>} A promise that resolves when the project is successfully updated.
 * @throws Will throw an error if updating the project fails.
 */
export async function updateProject(projectId: string, projectData: Partial<ProjectSubmitData>): Promise<void> {
  try {
    const projectDocRef = doc(db, 'projects', projectId);
    const dataToUpdate: any = {
      ...projectData,
      updatedAt: serverTimestamp(),
    };
    // Handle optional date fields: if they are explicitly passed as undefined, store null
    // or remove them if your DB handles absence better. Storing null is often simpler.
    if (Object.prototype.hasOwnProperty.call(projectData, 'startDate')) {
      dataToUpdate.startDate = projectData.startDate || null;
    }
    if (Object.prototype.hasOwnProperty.call(projectData, 'endDate')) {
      dataToUpdate.endDate = projectData.endDate || null;
    }

    await updateDoc(projectDocRef, dataToUpdate);
  } catch (error) {
    console.error(`Error updating project ${projectId}: `, error);
    throw new Error(`Failed to update project ${projectId} in database.`);
  }
}

/**
 * Deletes a project from Firestore.
 * @param {string} projectId The ID of the project to delete.
 * @returns {Promise<void>} A promise that resolves when the project is successfully deleted.
 * @throws Will throw an error if deleting the project fails.
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const projectDocRef = doc(db, 'projects', projectId);
    await deleteDoc(projectDocRef);
  } catch (error) {
    console.error(`Error deleting project ${projectId}: `, error);
    throw new Error(`Failed to delete project ${projectId} from database.`);
  }
}
