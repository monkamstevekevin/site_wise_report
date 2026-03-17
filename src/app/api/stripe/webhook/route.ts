import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, STRIPE_PLANS, type StripePlan } from '@/lib/stripe';
import { updateOrgSubscription, getOrganizationById } from '@/services/organizationService';
import { getOrganizationByStripeSubscriptionId } from '@/services/organizationService';
import { db } from '@/db';
import { webhookEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_PLANS = Object.keys(STRIPE_PLANS) as StripePlan[];

export const dynamic = 'force-dynamic';

function stripeStatusToAppStatus(status: string): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' {
  switch (status) {
    case 'active': return 'ACTIVE';
    case 'trialing': return 'TRIALING';
    case 'past_due': return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
    default:
      return 'CANCELED';
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err);
    return NextResponse.json({ error: 'Webhook signature invalide.' }, { status: 400 });
  }

  // Idempotency via DB — safe pour les déploiements multi-instances (Vercel)
  const existing = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, event.id))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ received: true, skipped: true });
  }

  // Enregistrer l'événement avant traitement (évite les races conditions)
  await db.insert(webhookEvents).values({ id: event.id }).onConflictDoNothing();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const planStr = session.metadata?.plan;

        // Valider le plan contre les plans connus — évite qu'un attaquant injecte un plan arbitraire
        const plan: StripePlan | undefined = planStr && VALID_PLANS.includes(planStr as StripePlan)
          ? (planStr as StripePlan)
          : undefined;

        if (!plan) {
          console.error('[webhook] Plan invalide dans les métadonnées:', planStr);
        }

        if (orgId && plan && session.subscription && session.customer) {
          const org = await getOrganizationById(orgId);
          if (org?.stripeSubscriptionId !== session.subscription) {
            await updateOrgSubscription(orgId, {
              plan,
              subscriptionStatus: 'ACTIVE',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const org = await getOrganizationByStripeSubscriptionId(sub.id);
        if (org) {
          await updateOrgSubscription(org.id, {
            subscriptionStatus: stripeStatusToAppStatus(sub.status),
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const org = await getOrganizationByStripeSubscriptionId(sub.id);
        if (org) {
          await updateOrgSubscription(org.id, {
            subscriptionStatus: 'CANCELED',
          });
        }
        break;
      }
    }
  } catch (err) {
    // Log but return 200 to prevent Stripe retries for internal errors
    console.error('[webhook] Erreur de traitement:', err);
  }

  return NextResponse.json({ received: true });
}
