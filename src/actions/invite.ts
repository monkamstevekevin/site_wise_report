'use server';

import { sendEmail } from '@/lib/email/client';
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

    const { error } = await sendEmail({ to: params.toEmail, subject, html });
    if (error) return { success: false, error };

    return { success: true };
  } catch (err) {
    console.error('[sendInviteEmail]', err);
    return { success: false, error: (err as Error).message };
  }
}
