
'use server';

import { db } from '@/lib/firebase';
import type { Project, MaterialType, User } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy, addDoc, serverTimestamp, updateDoc, setDoc, deleteDoc, writeBatch, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import type { ProjectSubmitData as OriginalProjectSubmitData } from '@/app/(app)/admin/projects/components/ProjectFormDialog';

// Adjust ProjectSubmitData to reflect assignedMaterialIds
export type ProjectSubmitData = Omit<OriginalProjectSubmitData, 'assignedMaterialTypes'> & {
  assignedMaterialIds?: string[];
};


/**
 * @fileOverview Project service for interacting with Firestore.
 *
 * - getProjects - Fetches all projects from Firestore (one-time).
 * - getProjectById - Fetches a single project by its ID from Firestore.
 * - addProject - Adds a new project to Firestore.
 * - updateProject - Updates an existing project in Firestore.
 * - deleteProject - Deletes a project from Firestore and cleans up user assignments.
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
 * Fetches all projects from the 'projects' collection in Firestore.
 * @returns {Promise<Project[]>} A promise that resolves to an array of Project objects.
 * @throws Will throw an error if fetching projects fails.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    const q = query(projectsCollectionRef, orderBy('createdAt', 'desc')); 
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(mapDocToProject);
  } catch (error: any) {
    console.error("Error fetching projects (see details below): ", error);
    if (error.code === 'failed-precondition') {
      console.warn(`[Service/getProjects] Firestore query for projects (orderBy createdAt) failed due to a missing index. Firebase message: ${error.message}. Please create the required index in your Firebase console. Returning empty array for now.`);
      const match = error.message.match(/(https:\/\/[^\s]+)/);
      if (match && match[0]) {
          console.warn(`[Service/getProjects] Create Index Link: ${match[0]}`);
      }
      return []; 
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
      return mapDocToProject(docSnap);
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
      name: projectData.name,
      location: projectData.location,
      description: projectData.description || '',
      status: projectData.status,
      startDate: projectData.startDate ? projectData.startDate.toISOString() : null,
      endDate: projectData.endDate ? projectData.endDate.toISOString() : null,    
      assignedMaterialIds: projectData.assignedMaterialIds || [],
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
      name: projectData.name,
      location: projectData.location,
      description: projectData.description,
      status: projectData.status,
      updatedAt: serverTimestamp(),
    };
    
    if (Object.prototype.hasOwnProperty.call(projectData, 'startDate')) {
      dataToUpdate.startDate = projectData.startDate ? projectData.startDate.toISOString() : null;
    }
    if (Object.prototype.hasOwnProperty.call(projectData, 'endDate')) {
      dataToUpdate.endDate = projectData.endDate ? projectData.endDate.toISOString() : null;
    }
    if (Object.prototype.hasOwnProperty.call(projectData, 'assignedMaterialIds')) {
      dataToUpdate.assignedMaterialIds = projectData.assignedMaterialIds || [];
    }

    await updateDoc(projectDocRef, dataToUpdate);
  } catch (error) {
    console.error(`Error updating project ${projectId}: `, error);
    throw new Error(`Failed to update project ${projectId} in database.`);
  }
}

/**
 * Deletes a project from Firestore and removes all associated user assignments.
 * @param {string} projectId The ID of the project to delete.
 * @returns {Promise<void>} A promise that resolves when the project and assignments are successfully deleted/removed.
 * @throws Will throw an error if the process fails.
 */
export async function deleteProject(projectId: string): Promise<void> {
  if (!projectId) {
    throw new Error("L'ID du projet est requis pour supprimer un projet.");
  }

  const projectDocRef = doc(db, 'projects', projectId);
  const usersCollectionRef = collection(db, 'users');

  try {
    const batch = writeBatch(db);

    // Récupérer tous les utilisateurs
    const usersSnapshot = await getDocs(usersCollectionRef);

    // Itérer sur les utilisateurs pour trouver et supprimer les assignations du projet supprimé
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data() as User;
      if (userData.assignments && Array.isArray(userData.assignments)) {
        const initialAssignmentsCount = userData.assignments.length;
        const updatedAssignments = userData.assignments.filter(
          assignment => assignment.projectId !== projectId
        );

        // Si les assignations ont changé, mettre à jour le document utilisateur dans le lot
        if (updatedAssignments.length < initialAssignmentsCount) {
          const userDocRefToUpdate = doc(db, 'users', userDoc.id);
          batch.update(userDocRefToUpdate, { assignments: updatedAssignments, updatedAt: serverTimestamp() });
        }
      }
    });

    // Ajouter la suppression du projet au lot
    batch.delete(projectDocRef);

    // Valider le lot
    await batch.commit();
    console.log(`Le projet ${projectId} et toutes ses assignations utilisateur ont été supprimés.`);

  } catch (error) {
    console.error(`Erreur lors de la suppression du projet ${projectId} et de ses assignations : `, error);
    throw new Error(`Échec de la suppression du projet ${projectId} et de ses assignations de la base de données.`);
  }
}
