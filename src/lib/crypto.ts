/**
 * AES-256-GCM application-level encryption for sensitive report fields.
 *
 * Setup (one-time):
 * 1. Generate a key:
 *    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * 2. Add to .env.local and Vercel env vars:
 *    ENCRYPTION_KEY=<base64-encoded-32-bytes>
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENC_MARKER = '_enc';

function getKey(): Buffer {
  const keyB64 = process.env.ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error(
      'ENCRYPTION_KEY env var is not set. Generate one with:\n' +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes when base64-decoded.');
  }
  return key;
}

/** Encrypt a UTF-8 string. Returns "iv:tag:ciphertext" (all base64). */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** Decrypt a payload produced by encrypt(). Throws on tampered data. */
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format.');
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Encrypt a nullable text field before DB write.
 * Returns null if the value is null/undefined/empty.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return value ?? null;
  return encrypt(value);
}

/**
 * Decrypt a nullable text field after DB read.
 * Gracefully returns the raw value if it doesn't look encrypted
 * (backwards-compatible for rows written before encryption was enabled).
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return value ?? null;
  // An encrypted payload always has exactly two ':' separators
  if ((value.match(/:/g) ?? []).length < 2) return value;
  try {
    return decrypt(value);
  } catch {
    // Legacy plaintext — return as-is so the app keeps working
    return value;
  }
}

/**
 * Encrypt a JSON object for JSONB storage.
 * Stores as { _enc: "<encrypted-json-string>" } to avoid a schema change.
 */
export function encryptJson(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (obj == null) return null;
  if (ENC_MARKER in obj) return obj; // already encrypted — idempotent
  return { [ENC_MARKER]: encrypt(JSON.stringify(obj)) };
}

/**
 * Decrypt a JSONB field that may contain an encrypted envelope.
 * Falls back to returning the object as-is for legacy plaintext rows.
 */
export function decryptJson(
  obj: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (obj == null) return null;
  if (!(ENC_MARKER in obj)) return obj; // plaintext (legacy / non-encrypted)
  try {
    return JSON.parse(decrypt(obj[ENC_MARKER] as string)) as Record<string, unknown>;
  } catch {
    return obj; // fallback: return raw
  }
}
