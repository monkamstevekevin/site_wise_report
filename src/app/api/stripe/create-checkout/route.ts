import { NextResponse } from 'next/server';
import { stripe, STRIPE_PLANS, type StripePlan } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { plan } = await request.json() as { plan: StripePlan };

    if (!STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // Get user's organization
    const userRows = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
    if (!userRows[0]?.organizationId) {
      return NextResponse.json({ error: 'Organisation introuvable.' }, { status: 404 });
    }

    const orgId = userRows[0].organizationId;
    const planConfig = STRIPE_PLANS[plan];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        organizationId: orgId,
        plan,
      },
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing?canceled=true`,
      customer_email: authUser.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err);
    return NextResponse.json({ error: 'Erreur lors de la création de la session de paiement.' }, { status: 500 });
  }
}
