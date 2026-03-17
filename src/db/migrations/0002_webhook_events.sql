-- Migration: table d'idempotency pour les webhooks Stripe
-- À exécuter dans Supabase SQL Editor (ou via Drizzle push)
-- Remplace le Set en mémoire (non distribué) par une table persistante.

CREATE TABLE IF NOT EXISTS webhook_events (
  id         text        PRIMARY KEY,        -- Stripe event ID (evt_xxx)
  processed_at timestamptz DEFAULT now() NOT NULL
);

-- Index pour le nettoyage périodique des anciens événements
CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON webhook_events (processed_at);

-- Optionnel : purger automatiquement les événements > 90 jours
-- (à lancer via cron ou pg_cron)
-- DELETE FROM webhook_events WHERE processed_at < now() - interval '90 days';
