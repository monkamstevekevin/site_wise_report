'use server';

import { resend, FROM_EMAIL } from '@/lib/email/client';
import { emailInvitation } from '@/lib/email/templates';
import { getOrganizationById } from '@/services/organizationService';

export async function sendInviteEmail(params: {
  toEmail: string;
  inviteToken: string;
  inviterName: string;
  organizationId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await getOrganizationById(params.organizationId);
    if (!org) return { success: false, error: 'Organisation introuvable.' };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const inviteUrl = `${appUrl}/auth/join?token=${params.inviteToken}`;

    const { subject, html } = emailInvitation({
      inviteUrl,
      organizationName: org.name,
      inviterName: params.inviterName,
    });

    if (!resend) {
      console.warn('[invite] RESEND_API_KEY non configurée — email non envoyé');
      return { success: false, error: 'Service email non configuré.' };
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: [params.toEmail],
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    console.error('[sendInviteEmail]', err);
    return { success: false, error: (err as Error).message };
  }
}
