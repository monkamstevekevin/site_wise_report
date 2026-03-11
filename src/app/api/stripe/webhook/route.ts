import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { updateOrgSubscription, getOrganizationById } from '@/services/organizationService';
import { getOrganizationByStripeSubscriptionId } from '@/services/organizationService';

// In-memory idempotency store (survives process lifetime, cleared on restart)
// For multi-instance deployments, replace with a Redis SET or DB table.
const processedEvents = new Set<string>();

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

  // Idempotency: skip already-processed events
  if (processedEvents.has(event.id)) {
    return NextResponse.json({ received: true, skipped: true });
  }
  processedEvents.add(event.id);
  // Trim set to avoid unbounded growth (keep last 1000 events)
  if (processedEvents.size > 1000) {
    processedEvents.delete(processedEvents.values().next().value!);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const plan = session.metadata?.plan as 'STARTER' | 'PRO' | undefined;

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
