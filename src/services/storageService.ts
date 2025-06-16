
'use server';

import { storage, auth } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, deleteObject, type StorageError, listAll } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * @fileOverview Firebase Storage service for handling file uploads and deletions,
 * specifically for user profile images.
 *
 * - uploadProfileImage: Uploads an image (file or data URI) to Firebase Storage.
 * - deleteProfileImage: Deletes a profile image from Firebase Storage.
 * - dataURIToBlob: Converts a data URI to a Blob object.
 */

/**
 * Converts a data URI string to a Blob object.
 * @param {string} dataURI The data URI to convert.
 * @returns {Blob} The Blob object.
 */
function dataURIToBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

/**
 * Deletes an existing profile image from Firebase Storage.
 * Attempts to extract the file path from the URL.
 * @param {string | null | undefined} imageUrl The URL of the image to delete.
 * @returns {Promise<void>}
 */
async function deleteOldImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    // Not a Firebase Storage URL or no image to delete
    return;
  }
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('Old profile image deleted successfully from Firebase Storage.');
  } catch (error) {
    const storageError = error as StorageError;
    if (storageError.code === 'storage/object-not-found') {
      console.warn('Old profile image not found, no deletion needed.');
    } else {
      console.error('Error deleting old profile image from Firebase Storage:', storageError);
      // Optionally re-throw or handle more gracefully
    }
  }
}


/**
 * Uploads a profile image to Firebase Storage.
 * If an oldImageUrl is provided and it's a Firebase Storage URL, it attempts to delete the old image first.
 * @param {string} userId The ID of the user.
 * @param {string} imageDataURI The image data as a data URI.
 * @param {string | null | undefined} oldImageUrl The URL of the user's current profile image, if any.
 * @returns {Promise<string>} A promise that resolves to the public URL of the uploaded image.
 * @throws Will throw an error if uploading fails.
 */
export async function uploadProfileImage(
  userId: string,
  imageDataURI: string,
  oldImageUrl?: string | null
): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to upload a profile image.');
  }
  if (!imageDataURI.startsWith('data:image')) {
    throw new Error('Invalid image data URI provided.');
  }

  // Attempt to delete the old image first if it exists
  if (oldImageUrl) {
    await deleteOldImage(oldImageUrl);
  }
  
  const fileExtension = imageDataURI.substring(imageDataURI.indexOf('/') + 1, imageDataURI.indexOf(';base64'));
  const fileName = `profile_${userId}_${uuidv4()}.${fileExtension}`;
  const storageRef = ref(storage, `profileImages/${userId}/${fileName}`);

  try {
    // Firebase Storage SDK's uploadString expects the base64 part of the data URI
    const base64String = imageDataURI.split(',')[1];
    const snapshot = await uploadString(storageRef, base64String, 'base64', {
      contentType: `image/${fileExtension}`,
    });
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Image uploaded successfully to Firebase Storage. URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    const storageError = error as StorageError;
    console.error('Error uploading profile image to Firebase Storage:', storageError);
    // Log the server response if available, as suggested by the error message
    if (storageError.serverResponse) {
      console.error('Server Response:', storageError.serverResponse);
    }
    throw new Error(`Failed to upload image. Firebase Storage Error: ${storageError.code} - ${storageError.message}`);
  }
}


/**
 * Deletes a user's profile image from Firebase Storage.
 * @param {string | null | undefined} imageUrl The URL of the image to delete.
 * @returns {Promise<void>}
 * @throws Will throw an error if deletion fails (other than object-not-found).
 */
export async function deleteProfileImage(imageUrl: string | null | undefined): Promise<void> {
   if (!imageUrl) {
    console.log('No image URL provided, skipping deletion.');
    return;
  }
  // Check if it's a Firebase Storage URL before attempting to delete
  if (!imageUrl.includes('firebasestorage.googleapis.com')) {
    console.warn('Provided URL is not a Firebase Storage URL, skipping deletion from Storage:', imageUrl);
    return;
  }
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('Profile image deleted successfully from Firebase Storage.');
  } catch (error) {
    const storageError = error as StorageError;
    if (storageError.code === 'storage/object-not-found') {
      // This is not an error for this operation, as the goal is for the image to not exist.
      console.warn('Profile image not found in Firebase Storage, no deletion needed.');
    } else {
      console.error('Error deleting profile image from Firebase Storage:', storageError);
       if (storageError.serverResponse) { // Also log server response here if available
        console.error('Server Response on delete:', storageError.serverResponse);
      }
      throw new Error(`Failed to delete image. Firebase Storage Error: ${storageError.code} - ${storageError.message}`);
    }
  }
}
