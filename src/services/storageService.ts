
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, uploadBytes, deleteObject, type StorageError } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * @fileOverview Storage service for Firebase Storage operations.
 *
 * - uploadProfileImage - Uploads a profile image (File or data URI) to Firebase Storage.
 * - deleteProfileImage - Deletes an image from Firebase Storage given its URL.
 */

// Helper to convert data URI to Blob (only if really needed, uploadString handles data URIs directly)
// function dataURIToBlob(dataURI: string): Blob {
//   const byteString = atob(dataURI.split(',')[1]);
//   const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
//   const ab = new ArrayBuffer(byteString.length);
//   const ia = new Uint8Array(ab);
//   for (let i = 0; i < byteString.length; i++) {
//     ia[i] = byteString.charCodeAt(i);
//   }
//   return new Blob([ab], { type: mimeString });
// }

/**
 * Uploads a profile image to Firebase Storage.
 * @param userId The ID of the user.
 * @param imageFile The image file (File object) or data URI (string).
 * @param existingPhotoUrl Optional. The URL of the existing photo to delete before uploading new one.
 * @returns {Promise<string>} A promise that resolves to the download URL of the uploaded image.
 */
export async function uploadProfileImage(
  userId: string,
  imageFile: File | string,
  existingPhotoUrl?: string | null
): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required for uploading profile image.');
  }
  if (!imageFile) {
    throw new Error('Image file or data URI is required.');
  }

  // Attempt to delete existing photo if URL is provided and it's a Firebase Storage URL
  if (existingPhotoUrl && existingPhotoUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const existingImageRef = ref(storage, existingPhotoUrl);
      await deleteObject(existingImageRef);
      console.log("Previous profile photo deleted from Firebase Storage.");
    } catch (error) {
      const storageError = error as StorageError;
      // If deletion fails (e.g., file not found, permissions), log it but don't block new upload
      if (storageError.code !== 'storage/object-not-found') {
        console.warn("Could not delete existing profile photo from Firebase Storage:", storageError.code, storageError.message);
      }
    }
  }

  // Determine file extension for a more descriptive name (optional but good practice)
  let fileExtension = '.jpg'; // Default
  if (typeof imageFile !== 'string') { // Is File object
    const typeParts = imageFile.type.split('/');
    if (typeParts.length === 2 && typeParts[0] === 'image') {
      fileExtension = `.${typeParts[1]}`;
    }
  } else { // Is data URI
    const mimeMatch = imageFile.match(/^data:(image\/([a-zA-Z]+));base64,/);
    if (mimeMatch && mimeMatch[2]) {
      fileExtension = `.${mimeMatch[2]}`;
    }
  }


  const fileName = `profile_${userId}_${uuidv4()}${fileExtension}`;
  const storageRef = ref(storage, `profileImages/${userId}/${fileName}`);
  
  let uploadTask;

  if (typeof imageFile === 'string') { // It's a data URI
    // Firebase's uploadString handles data URIs well.
    // We need to pass 'data_url' as the format.
    uploadTask = await uploadString(storageRef, imageFile, 'data_url');
  } else { // It's a File object
    uploadTask = await uploadBytes(storageRef, imageFile);
  }

  const downloadURL = await getDownloadURL(uploadTask.ref);
  return downloadURL;
}

/**
 * Deletes a profile image from Firebase Storage if the URL points to Firebase Storage.
 * @param photoUrl The URL of the photo to delete.
 * @returns {Promise<void>}
 */
export async function deleteProfileImage(photoUrl: string): Promise<void> {
  if (!photoUrl || !photoUrl.includes('firebasestorage.googleapis.com')) {
    console.log("Skipping deletion: URL is not a Firebase Storage URL or is empty/null.");
    return;
  }
  try {
    const imageRef = ref(storage, photoUrl);
    await deleteObject(imageRef);
    console.log("Profile photo deleted from Firebase Storage.");
  } catch (error) {
    const storageError = error as StorageError;
    if (storageError.code === 'storage/object-not-found') {
        console.log("Image to delete not found in Firebase Storage. It might have been already deleted or never existed at this URL.");
    } else {
        console.error("Error deleting profile photo from Firebase Storage:", storageError.code, storageError.message);
        // We might not want to throw here if deletion is a cleanup step and not critical to user flow
        // throw new Error("Failed to delete profile image from storage."); 
    }
  }
}
