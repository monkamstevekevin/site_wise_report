'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataURIToBlob(dataURI: string): { blob: Blob; mimeType: string; extension: string } {
  const mimeType = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const extension = mimeType.split('/')[1] ?? 'png';
  const byteString = atob(dataURI.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return { blob: new Blob([ab], { type: mimeType }), mimeType, extension };
}

/** Extrait le chemin relatif d'une URL Supabase Storage publique. */
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.substring(idx + marker.length));
}

// ─── Avatars ─────────────────────────────────────────────────────────────────

/**
 * Upload une image de profil dans le bucket `avatars`.
 * Supprime l'ancienne image si elle est hébergée sur Supabase Storage.
 */
export async function uploadProfileImage(
  userId: string,
  imageDataURI: string,
  oldImageUrl?: string | null
): Promise<string> {
  if (!userId) throw new Error('User ID is required to upload a profile image.');
  if (!imageDataURI.startsWith('data:image')) throw new Error('Invalid image data URI provided.');

  // Supprimer l'ancienne image si elle est dans notre bucket
  if (oldImageUrl) {
    const oldPath = extractStoragePath(oldImageUrl, 'avatars');
    if (oldPath) {
      await supabaseAdmin.storage.from('avatars').remove([oldPath]);
    }
  }

  const { blob, mimeType, extension } = dataURIToBlob(imageDataURI);
  const path = `${userId}/profile_${uuidv4()}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Échec de l'upload de l'image : ${error.message}`);

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Supprime une image de profil du bucket `avatars`.
 */
export async function deleteProfileImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;
  const path = extractStoragePath(imageUrl, 'avatars');
  if (!path) return;
  await supabaseAdmin.storage.from('avatars').remove([path]);
}

// ─── Pièces jointes de rapports ───────────────────────────────────────────────

/**
 * Upload une pièce jointe de rapport dans le bucket `report-attachments`.
 */
export async function uploadReportAttachment(
  reportId: string,
  fileDataURI: string,
  fileName: string
): Promise<string> {
  if (!fileDataURI.startsWith('data:')) throw new Error('Invalid data URI provided.');

  const { blob, mimeType } = dataURIToBlob(fileDataURI);
  const path = `${reportId}/${uuidv4()}_${fileName}`;

  const { error } = await supabaseAdmin.storage
    .from('report-attachments')
    .upload(path, blob, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Échec de l'upload de la pièce jointe : ${error.message}`);

  const { data } = supabaseAdmin.storage.from('report-attachments').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Supprime une pièce jointe du bucket `report-attachments`.
 */
export async function deleteReportAttachment(fileUrl: string): Promise<void> {
  const path = extractStoragePath(fileUrl, 'report-attachments');
  if (!path) return;
  await supabaseAdmin.storage.from('report-attachments').remove([path]);
}
