/**
 * Utilitaire d'upload de photos vers Supabase Storage.
 * Remplace le stockage base64 dans la DB (photo_url TEXT).
 *
 * Prérequis Supabase (à faire manuellement une seule fois) :
 * 1. Storage → Create bucket "report-photos" → Public: YES
 * 2. Storage → Policies → "report-photos" → Add policy :
 *    - SELECT : true (lecture publique)
 *    - INSERT : (auth.role() = 'authenticated') — seuls les users connectés peuvent uploader
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const BUCKET = 'report-photos';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadReportPhoto(file: File): Promise<string> {
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('La photo est trop grande (max 10 Mo).');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.');
  }

  const supabase = createSupabaseBrowserClient();

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  // Chemin unique : timestamp + random pour éviter les collisions
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload photo échoué : ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
