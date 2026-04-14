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

// ─── Validation ──────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;        // 5 MB
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;  // 20 MB

function assertDataURI(
  dataURI: string,
  allowedTypes: Set<string>,
  maxBytes: number
): void {
  const mimeType = dataURI.split(',')[0]?.split(':')[1]?.split(';')[0];
  if (!mimeType || !allowedTypes.has(mimeType)) {
    throw new Error(
      `Type de fichier non autorisé : ${mimeType ?? 'inconnu'}. ` +
      `Types acceptés : ${[...allowedTypes].join(', ')}`
    );
  }
  const base64 = dataURI.split(',')[1] ?? '';
  const estimatedBytes = Math.ceil(base64.length * 0.75);
  if (estimatedBytes > maxBytes) {
    throw new Error(
      `Fichier trop volumineux (${Math.round(estimatedBytes / 1024 / 1024 * 10) / 10} MB). ` +
      `Maximum : ${Math.round(maxBytes / 1024 / 1024)} MB.`
    );
  }
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
  assertDataURI(imageDataURI, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);

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

// ─── Logos d'organisation ────────────────────────────────────────────────────

/**
 * Upload un logo d'organisation dans le bucket `avatars` (dossier org-logos/).
 */
export async function uploadOrgLogo(
  orgId: string,
  imageDataURI: string,
  oldLogoUrl?: string | null
): Promise<string> {
  if (!orgId) throw new Error('Organization ID is required.');
  assertDataURI(imageDataURI, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);

  if (oldLogoUrl) {
    const oldPath = extractStoragePath(oldLogoUrl, 'avatars');
    if (oldPath) await supabaseAdmin.storage.from('avatars').remove([oldPath]);
  }

  const { blob, mimeType, extension } = dataURIToBlob(imageDataURI);
  const path = `org-logos/${orgId}/logo_${uuidv4()}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Échec de l'upload du logo : ${error.message}`);

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
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
  assertDataURI(fileDataURI, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES);

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
