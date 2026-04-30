# À faire plus tard

## Upstash Redis — Activer le rate limiting

Le code est déjà en place (`src/lib/ratelimit.ts` + `src/middleware.ts`).
Fonctionne en mode no-op sans les variables — rien à changer dans le code.

**Étapes quand tu es prêt :**
1. Créer un compte gratuit sur https://upstash.com
2. Créer une base Redis (plan gratuit suffit)
3. Ajouter dans Vercel → Environment Variables :
   - `UPSTASH_REDIS_REST_URL` = `https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AXxx...`
4. Redéployer → le rate limiting s'active automatiquement

**Limites configurées :**
- Routes standard (`/api/time-entries`, `/api/admin/*`) : 30 req/min par IP
- Routes lourdes (`/api/admin/org-logo`, `/api/stripe/*`) : 5 req/min par IP
