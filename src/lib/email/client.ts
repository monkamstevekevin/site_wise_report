import { Resend } from 'resend';

// Graceful fallback si la clé n'est pas configurée
const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'SiteWise Reports <onboarding@resend.dev>';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
