/**
 * Fetches the org logo as a base64 data URI via the server-side API route.
 * The server downloads the image from Supabase Storage (no CORS issues).
 * Returns null if no logo is configured.
 */
export async function fetchOrgLogoDataUri(): Promise<string | null> {
  try {
    const res = await fetch('/api/admin/org-logo');
    if (!res.ok) return null;
    const { logoDataUri } = await res.json();
    return logoDataUri ?? null;
  } catch {
    return null;
  }
}
