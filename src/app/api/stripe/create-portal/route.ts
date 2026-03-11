import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const userRows = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    if (!userRows[0]?.organizationId) {
      return NextResponse.json({ error: 'Organisation introuvable.' }, { status: 404 });
    }

    const orgRows = await db.select().from(organizations).where(eq(organizations.id, userRows[0].organizationId)).limit(1);
    if (!orgRows[0]?.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe trouvé.' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await getStripe().billingPortal.sessions.create({
      customer: orgRows[0].stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-portal]', err);
    return NextResponse.json({ error: 'Erreur lors de la création du portail.' }, { status: 500 });
  }
}
