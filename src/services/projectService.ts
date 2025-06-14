
'use server';

import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * @fileOverview Project service for interacting with Firestore.
 *
 * - getProjects - Fetches all projects from Firestore.
 * - getProjectById - Fetches a single project by its ID from Firestore.
 * - addProject - Adds a new project to Firestore.
 */

/**
 * Fetches all projects from the 'projects' collection in Firestore, ordered by name.
 * @returns {Promise<Project[]>} A promise that resolves to an array of Project objects.
 * @throws Will throw an error if fetching projects fails.
 */
export async function getProjects(): Promise<Project[]> {
  try {
    const projectsCollectionRef = collection(db, 'projects');
    // Order by name for consistent listing
    const q = query(projectsCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const projects: Project[] = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name,
        location: data.location,
        description: data.description || '',
        status: data.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Project;
    });
    return projects;
  } catch (error) {
    console.error("Error fetching projects: ", error);
    throw new Error("Failed to fetch projects from database.");
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
        name: data.name,
        location: data.location,
        description: data.description || '',
        status: data.status,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Project;
    } else {
      console.log("No such project document with ID:", projectId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching project by ID: ", error);
    return null;
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

// Future functions for update, delete projects will go here.

