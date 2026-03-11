import Stripe from 'stripe';

// Lazy Stripe client — initialized on first use so module-level errors
// are caught by the route handler's try/catch instead of crashing the module.
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY manquant dans les variables d\'environnement Vercel.');
    _stripe = new Stripe(key.trim(), {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    });
  }
  return _stripe;
}

export const STRIPE_PLANS = {
  STARTER: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 49,
    currency: 'usd',
    maxUsers: 5,
    description: 'Idéal pour les petites équipes',
  },
  PRO: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    price: 149,
    currency: 'usd',
    maxUsers: null, // unlimited
    description: 'Pour les grandes équipes sans limite',
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PLANS;
