import { NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, users } from '@/db/schema';
import { eq, and, gt, lte } from 'drizzle-orm';
import { resend, FROM_EMAIL } from '@/lib/email/client';
import { emailTrialExpiring } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Protect endpoint: Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Find orgs whose trial ends in the next 2–3 days (window for daily cron)
  const now = new Date();
  const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringOrgs = await db
    .select()
    .from(organizations)
    .where(
      and(
        eq(organizations.subscriptionStatus, 'TRIALING'),
        gt(organizations.trialEndsAt, in2Days),
        lte(organizations.trialEndsAt, in3Days),
      )
    );

  if (expiringOrgs.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const org of expiringOrgs) {
    // Get all ADMIN users for this org
    const admins = await db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, org.id), eq(users.role, 'ADMIN')));

    const daysLeft = org.trialEndsAt
      ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 3;

    const { subject, html } = emailTrialExpiring({
      organizationName: org.name,
      daysLeft,
      billingUrl: `${appUrl}/settings/billing`,
    });

    for (const admin of admins) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [admin.email],
          subject,
          html,
        });
        sent++;
      } catch (err) {
        errors.push(`${admin.email}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`[cron/trial-expiry] ${sent} email(s) sent, ${errors.length} error(s)`);
  if (errors.length) console.error('[cron/trial-expiry] Errors:', errors);

  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
