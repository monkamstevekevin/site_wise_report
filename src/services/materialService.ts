
'use server';

import { db } from '@/lib/firebase';
import type { Material, MaterialType, MaterialValidationRules } from '@/lib/types';
import { collection, getDocs, doc, getDoc, Timestamp, query, orderBy, addDoc, serverTimestamp, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import type { MaterialSubmitData } from '@/app/(app)/admin/materials/components/MaterialFormDialog';


/**
 * @fileOverview Material service for interacting with Firestore.
 *
 * - getMaterials - Fetches all materials from Firestore.
 * - getMaterialById - Fetches a single material by its ID from Firestore.
 * - addMaterial - Adds a new material to Firestore.
 * - updateMaterial - Updates an existing material in Firestore.
 * - deleteMaterial - Deletes a material from Firestore.
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

/**
 * Adds a new material to the 'materials' collection in Firestore.
 * @param materialData The data for the new material.
 * @returns {Promise<string>} A promise that resolves to the ID of the newly created material.
 * @throws Will throw an error if adding the material fails.
 */
export async function addMaterial(
  materialData: MaterialSubmitData
): Promise<string> {
  try {
    const materialsCollectionRef = collection(db, 'materials');
    const docRef = await addDoc(materialsCollectionRef, {
      ...materialData,
      validationRules: materialData.validationRules || {}, // Ensure it's an object
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding material: ", error);
    throw new Error("Failed to add material to database.");
  }
}

/**
 * Updates an existing material in Firestore.
 * @param {string} materialId The ID of the material to update.
 * @param {MaterialSubmitData} materialData The data to update.
 * @returns {Promise<void>} A promise that resolves when the material is successfully updated.
 * @throws Will throw an error if updating the material fails.
 */
export async function updateMaterial(materialId: string, materialData: MaterialSubmitData): Promise<void> {
  try {
    const materialDocRef = doc(db, 'materials', materialId);
    await updateDoc(materialDocRef, {
      ...materialData,
      validationRules: materialData.validationRules || {},
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating material ${materialId}: `, error);
    throw new Error(`Failed to update material ${materialId} in database.`);
  }
}

/**
 * Deletes a material from Firestore.
 * @param {string} materialId The ID of the material to delete.
 * @returns {Promise<void>} A promise that resolves when the material is successfully deleted.
 * @throws Will throw an error if deleting the material fails.
 */
export async function deleteMaterial(materialId: string): Promise<void> {
  try {
    const materialDocRef = doc(db, 'materials', materialId);
    await deleteDoc(materialDocRef);
  } catch (error) {
    console.error(`Error deleting material ${materialId}: `, error);
    throw new Error(`Failed to delete material ${materialId} from database.`);
  }
}
