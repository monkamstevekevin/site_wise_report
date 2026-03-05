import Stripe from 'stripe';

// Server-only Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

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
