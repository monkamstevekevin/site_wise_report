/**
 * Converts a remote image URL to a base64 data URI.
 * Required for @react-pdf/renderer which cannot load external URLs due to CORS.
 */
export async function fetchLogoAsDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch logo: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
