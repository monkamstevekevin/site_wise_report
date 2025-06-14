
'use server';

import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy, addDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';

/**
 * @fileOverview Project service for interacting with Firestore.
 *
 * - getProjects - Fetches all projects from Firestore.
 * - getProjectById - Fetches a single project by its ID from Firestore.
 * - addProject - Adds a new project to Firestore.
 * - updateProject - Updates an existing project in Firestore.
 */

const formatTimestamp = (timestampField: any): string => {
  if (!timestampField) {
    // console.warn('Timestamp field is missing, returning current date as fallback.');
    return new Date().toISOString();
  }
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  // Handle cases where it might be a plain object from Firestore (e.g. from serverTimestamp before full hydration or manual entry)
  if (timestampField.seconds !== undefined && typeof timestampField.nanoseconds === 'number') {
    return new Timestamp(timestampField.seconds, timestampField.nanoseconds).toDate().toISOString();
  }
  // Handle string or number dates (less ideal, but common in manual entries or migrations)
  if (typeof timestampField === 'string' || typeof timestampField === 'number') {
    const date = new Date(timestampField);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  // console.warn('Invalid or unhandled timestamp data format:', timestampField, 'Returning current date as fallback.');
  return new Date().toISOString(); // Fallback for unrecognized formats
};

/**
 * Fetches all projects from the 'projects' collection in Firestore.
 * @returns {Promise<Project[]>} A promise that resolves to an array of Project objects.
 * @throws Will throw an error if fetching projects fails.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    // To order by name, ensure an index exists for the 'name' field in the 'projects' collection.
    // const q = query(projectsCollectionRef, orderBy('name')); 
    // Using a simple query without ordering for now:
    const querySnapshot = await getDocs(projectsCollectionRef);
    
    const projects: Project[] = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      // Provide default values for fields to prevent errors if data is malformed
      return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed Project',
        location: data.location || 'Unknown Location',
        description: data.description || '',
        status: data.status || 'INACTIVE', // Ensure this default is a valid Project['status']
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Project; // Cast as Project, assuming defaults align with type
    });
    return projects;
  } catch (error) {
    console.error("Error fetching projects (see details below): ", error);
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
 * @param {Omit<Project, 'id' | 'createdAt' | 'updatedAt'>} projectData The data for the new project.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created project.
 * @throws Will throw an error if adding the project fails.
 */
export async function addProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    const docRef = await addDoc(projectsCollectionRef, {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding project: ", error);
    throw new Error("Failed to add project to database.");
  }
}

/**
 * Updates an existing project in Firestore.
 * @param {string} projectId The ID of the project to update.
 * @param {Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>} projectData The data to update.
 * @returns {Promise<void>} A promise that resolves when the project is successfully updated.
 * @throws Will throw an error if updating the project fails.
 */
export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  try {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, {
      ...projectData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating project ${projectId}: `, error);
    throw new Error(`Failed to update project ${projectId} in database.`);
  }
}


// Future functions for delete projects will go here.
