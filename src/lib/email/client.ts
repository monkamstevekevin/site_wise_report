export const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? '';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

/**
 * Envoie un email via l'API Brevo (ex-Sendinblue).
 * Requiert BREVO_API_KEY et BREVO_FROM_EMAIL dans les variables d'environnement.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.warn('[email] BREVO_API_KEY ou BREVO_FROM_EMAIL non configuré');
    return { error: 'Service email non configuré.' };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'SiteWise Reports', email: fromEmail },
      to: [{ email: params.to }],
      subject: params.subject,
      htmlContent: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as any)?.message ?? `Brevo error ${res.status}`;
    console.error('[email] Brevo error:', message);
    return { error: message };
  }

  return {};
}
