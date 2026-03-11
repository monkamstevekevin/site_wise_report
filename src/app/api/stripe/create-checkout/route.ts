import { NextResponse } from 'next/server';
import { stripe, STRIPE_PLANS, type StripePlan } from '@/lib/stripe';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant dans les variables d\'environnement Vercel).' }, { status: 500 });
    }

    const { plan } = await request.json() as { plan: StripePlan };

    if (!STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    }

    const planConfig = STRIPE_PLANS[plan];
    if (!planConfig.priceId) {
      return NextResponse.json({ error: `Price ID Stripe manquant pour le plan ${plan}. Vérifiez STRIPE_${plan}_PRICE_ID dans Vercel.` }, { status: 500 });
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

    // Build the public origin — take only the first value of each header (proxies can chain them).
    const rawProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const proto = rawProto.split(',')[0].trim();
    const rawHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
    const host = rawHost.split(',')[0].trim();

    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const appUrl = (envUrl && envUrl.startsWith('http'))
      ? envUrl.trim().replace(/\/$/, '')
      : `${proto}://${host}`.trim();

    const successUrl = `${appUrl}/settings/billing?success=true`;
    const cancelUrl = `${appUrl}/settings/billing?canceled=true`;

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
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: authUser?.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout]', err);
    const message = (err as any)?.message ?? 'Erreur lors de la création de la session de paiement.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
