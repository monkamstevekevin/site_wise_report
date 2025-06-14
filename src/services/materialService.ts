
'use server';

import { db } from '@/lib/firebase';
import type { Material } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy } from 'firebase/firestore';

/**
 * @fileOverview Material service for interacting with Firestore.
 *
 * - getMaterials - Fetches all materials from Firestore.
 * - getMaterialById - Fetches a single material by its ID from Firestore.
 * - (Future: addMaterial, updateMaterial, deleteMaterial)
 */

const formatTimestamp = (timestampField: any): string => {
  if (!timestampField) {
    return new Date().toISOString();
  }
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  // Handle cases where timestamp might be an object from Firestore but not an instance of Timestamp
  // (e.g., after being serialized and deserialized, or directly from certain SDK versions/contexts)
  if (timestampField.seconds !== undefined && typeof timestampField.nanoseconds === 'number') {
    return new Timestamp(timestampField.seconds, timestampField.nanoseconds).toDate().toISOString();
  }
  // Handle cases where it might already be a string or number (e.g., from mock data or other sources)
  if (typeof timestampField === 'string' || typeof timestampField === 'number') {
    const date = new Date(timestampField);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  // Fallback for any other unexpected format
  return new Date().toISOString(); 
};


/**
 * Fetches all materials from the 'materials' collection in Firestore.
 * @returns {Promise<Material[]>} A promise that resolves to an array of Material objects.
 * @throws Will throw an error if fetching materials fails.
 */
export async function getMaterials(): Promise<Material[]> {
  try {
    const materialsCollectionRef = collection(db, 'materials');
    // To order by name, ensure an index exists for the 'name' field in the 'materials' collection.
    // const q = query(materialsCollectionRef, orderBy('name'));
    const q = query(materialsCollectionRef); // Query without ordering for now to avoid index issues
    const querySnapshot = await getDocs(q);
    
    const materials: Material[] = querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        name: data.name || 'Unnamed Material',
        type: data.type || 'other', // Default to 'other' if type is missing
        validationRules: data.validationRules || {}, // Default to empty object
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Material; 
    });
    return materials;
  } catch (error) {
    console.error("Error fetching materials (see details below): ", error);
    throw new Error("Failed to fetch materials from database. Check server logs for Firebase error details.");
  }
}

/**
 * Fetches a single material by its ID from Firestore.
 * @param {string} materialId The ID of the material to fetch.
 * @returns {Promise<Material | null>} A promise that resolves to the Material object or null if not found.
 */
export async function getMaterialById(materialId: string): Promise<Material | null> {
  try {
    const materialDocRef = doc(db, 'materials', materialId);
    const docSnap = await getDoc(materialDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || 'Unnamed Material',
        type: data.type || 'other',
        validationRules: data.validationRules || {},
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      } as Material;
    } else {
      console.log("No such material document with ID:", materialId);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching material by ID ${materialId}: `, error);
    throw new Error(`Failed to fetch material ${materialId} from database.`);
  }
}

// Placeholder for future CRUD operations:
// export async function addMaterial(materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> { ... }
// export async function updateMaterial(materialId: string, materialData: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> { ... }
// export async function deleteMaterial(materialId: string): Promise<void> { ... }
