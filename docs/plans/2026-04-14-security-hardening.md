# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Renforcer la sécurité de l'application SiteWise sur 5 axes : validation des uploads, autorisation dans les server actions, rate limiting, RLS Supabase, et durcissement des headers.

**Architecture:** Approche défense-en-profondeur — chaque couche (réseau, application, base de données) ajoute une barrière indépendante. Les fixes ne dépendent pas les uns des autres et peuvent être déployés séparément.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Supabase, @upstash/ratelimit, TypeScript

---

## Contexte : ce qui est déjà OK

- ✅ Security headers complets dans `next.config.ts` (CSP, HSTS, etc.)
- ✅ Stripe webhook avec vérification de signature
- ✅ IDOR corrigé sur `/api/time-entries` (session précédente)
- ✅ Toutes les routes API scoped par `organizationId`
- ✅ Cron endpoints protégés par `CRON_SECRET`

---

## Task 1 : Validation des uploads (MIME + taille)

**Problème :** `storageService.ts` accepte n'importe quel type de fichier. Un attaquant peut uploader du SVG avec JS embarqué, un HTML, ou un fichier énorme.

**Fichiers :**
- Modifier : `src/services/storageService.ts`

**Step 1 : Ajouter la fonction de validation en haut du fichier**

Après la fonction `dataURIToBlob`, avant la section `// ─── Avatars`, insérer :

```typescript
// ─── Validation ──────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;        // 5 MB
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;  // 20 MB

function assertDataURI(
  dataURI: string,
  allowedTypes: Set<string>,
  maxBytes: number
): void {
  const mimeType = dataURI.split(',')[0]?.split(':')[1]?.split(';')[0];
  if (!mimeType || !allowedTypes.has(mimeType)) {
    throw new Error(
      `Type de fichier non autorisé : ${mimeType ?? 'inconnu'}. ` +
      `Types acceptés : ${[...allowedTypes].join(', ')}`
    );
  }
  // Base64: 4 chars = 3 bytes → estimated real size
  const base64 = dataURI.split(',')[1] ?? '';
  const estimatedBytes = Math.ceil(base64.length * 0.75);
  if (estimatedBytes > maxBytes) {
    throw new Error(
      `Fichier trop volumineux (${Math.round(estimatedBytes / 1024 / 1024 * 10) / 10} MB). ` +
      `Maximum : ${Math.round(maxBytes / 1024 / 1024)} MB.`
    );
  }
}
```

**Step 2 : Appliquer la validation dans `uploadProfileImage`**

Remplacer la ligne de validation existante :
```typescript
  if (!imageDataURI.startsWith('data:image')) throw new Error('Invalid image data URI provided.');
```
Par :
```typescript
  assertDataURI(imageDataURI, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
```

**Step 3 : Appliquer la validation dans `uploadOrgLogo`**

Même remplacement dans `uploadOrgLogo` (chercher la ligne `startsWith('data:image')` dans cette fonction).

**Step 4 : Appliquer la validation dans `uploadReportAttachment`**

Remplacer :
```typescript
  if (!fileDataURI.startsWith('data:')) throw new Error('Invalid data URI provided.');
```
Par :
```typescript
  assertDataURI(fileDataURI, ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES);
```

**Step 5 : Commit**

```bash
git add src/services/storageService.ts
git commit -m "security: add MIME allowlist and size limits for file uploads"
```

---

## Task 2 : Autorisation dans `updateUserProfile`

**Problème :** `updateUserProfile(userId, data)` est un server action qui accepte n'importe quel `userId` sans vérifier que le caller est bien le propriétaire du profil.

**Fichiers :**
- Modifier : `src/actions/users.ts`

**Step 1 : Ajouter l'import Supabase**

En haut du fichier, après les imports existants, ajouter :
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';
```

**Step 2 : Ajouter le check d'autorisation dans `updateUserProfile`**

Remplacer le début de la fonction :
```typescript
export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string | null }
): Promise<AppUser> {
  await db
    .update(users)
```
Par :
```typescript
export async function updateUserProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string | null }
): Promise<AppUser> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    throw new Error('Unauthorized: cannot update another user\'s profile.');
  }

  await db
    .update(users)
```

**Step 3 : Commit**

```bash
git add src/actions/users.ts
git commit -m "security: enforce caller identity check in updateUserProfile server action"
```

---

## Task 3 : Rate Limiting (Upstash)

**Problème :** Aucune limite sur les appels API — un attaquant peut spammer les routes d'upload, de création de rapports, etc.

**Approche :** Middleware Next.js + Upstash Redis. Si `UPSTASH_REDIS_REST_URL` n'est pas configuré, le middleware passe en mode no-op (zéro impact sur dev local).

**Fichiers :**
- Installer : `@upstash/ratelimit @upstash/redis`
- Créer : `src/lib/ratelimit.ts`
- Créer : `src/middleware.ts`

**Step 1 : Installer les dépendances**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Step 2 : Créer `src/lib/ratelimit.ts`**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Returns null if Upstash is not configured → graceful no-op in development
function createLimiter(requests: number, window: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

// 30 req/min for general API calls
export const apiLimiter = createLimiter(30, '1 m');

// 5 req/min for heavy operations (file upload, checkout)
export const heavyLimiter = createLimiter(5, '1 m');
```

**Step 3 : Créer `src/middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { apiLimiter, heavyLimiter } from '@/lib/ratelimit';

// Routes where heavy rate limiting applies (5 req/min)
const HEAVY_ROUTES = [
  '/api/admin/org-logo',
  '/api/stripe/create-checkout',
  '/api/stripe/create-portal',
];

// Routes where standard rate limiting applies (30 req/min)
const API_ROUTES = [
  '/api/time-entries',
  '/api/admin/recommendations',
  '/api/admin/users-activity',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isHeavy = HEAVY_ROUTES.some(r => pathname.startsWith(r));
  const isApi = API_ROUTES.some(r => pathname.startsWith(r));

  if (!isHeavy && !isApi) return NextResponse.next();

  const limiter = isHeavy ? heavyLimiter : apiLimiter;

  // No-op if Upstash not configured
  if (!limiter) return NextResponse.next();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
```

**Step 4 : Variables d'environnement à ajouter dans Vercel**

Créer un compte gratuit sur https://upstash.com → créer une base Redis → copier les clés :
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

> ⚠️ Sans ces variables, le rate limiting est simplement désactivé — l'app continue de fonctionner normalement.

**Step 5 : Commit**

```bash
git add src/lib/ratelimit.ts src/middleware.ts package.json package-lock.json
git commit -m "security: add IP-based rate limiting via Upstash (graceful no-op if not configured)"
```

---

## Task 4 : Supabase Row Level Security (RLS)

**Problème :** RLS est désactivé sur toutes les tables. Si la connection string PostgreSQL fuite, toutes les données de tous les clients sont exposées.

**Approche :** Script SQL à exécuter dans le Supabase Dashboard → SQL Editor. Crée une fonction helper `auth_user_org_id()` et applique des politiques d'isolation par org sur chaque table.

> Note : Le code applicatif utilise Drizzle via postgres URL direct (service role) — RLS ne l'affecte pas. La protection s'applique aux connexions Supabase SDK (anon key) et à l'accès direct à la DB.

**Fichiers :**
- Créer : `docs/supabase-rls.sql` (à exécuter manuellement dans Supabase)

**Step 1 : Créer `docs/supabase-rls.sql`**

```sql
-- ============================================================
-- SiteWise Reports — Row Level Security
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Helper : retourne l'org_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

-- ── users ────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Un utilisateur voit uniquement les membres de son org
CREATE POLICY "users_org_isolation" ON public.users
  USING (organization_id = auth_user_org_id());

-- Un utilisateur peut mettre à jour son propre profil
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ── organizations ────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_own_only" ON public.organizations
  USING (id = auth_user_org_id());

-- ── projects ─────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_org_isolation" ON public.projects
  USING (organization_id = auth_user_org_id());

-- ── reports ──────────────────────────────────────────────────
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_org_isolation" ON public.reports
  USING (organization_id = auth_user_org_id());

-- ── time_entries ─────────────────────────────────────────────
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_entries_org_isolation" ON public.time_entries
  USING (organization_id = auth_user_org_id());

-- ── user_assignments ─────────────────────────────────────────
ALTER TABLE public.user_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_org_isolation" ON public.user_assignments
  USING (organization_id = auth_user_org_id());

-- ── notifications ────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_only" ON public.notifications
  USING (user_id = auth.uid());

-- ── webhook_events (si existe) ───────────────────────────────
-- ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- Pas de RLS needed — table système, accès service role uniquement

-- ============================================================
-- Vérification
-- ============================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Step 2 : Exécuter dans Supabase**

1. Ouvrir https://supabase.com/dashboard → ton projet → SQL Editor
2. Coller le contenu de `docs/supabase-rls.sql`
3. Cliquer "Run"
4. Vérifier que la colonne `rowsecurity` = `true` pour chaque table

**Step 3 : Commit du script**

```bash
git add docs/supabase-rls.sql
git commit -m "security: add Supabase RLS policies for org isolation and self-access"
```

---

## Task 5 : Durcissement des headers HTTP

**Problème :** `X-Frame-Options: SAMEORIGIN` permet à d'autres pages du même domaine d'embarquer l'app dans un iframe. Pour un SaaS sans iframes, `DENY` est plus sécuritaire.

**Fichiers :**
- Modifier : `next.config.ts`

**Step 1 : Changer `SAMEORIGIN` → `DENY`**

Dans `next.config.ts`, ligne `{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }` :
```typescript
{ key: 'X-Frame-Options', value: 'DENY' },
```

**Step 2 : Commit**

```bash
git add next.config.ts
git commit -m "security: set X-Frame-Options to DENY (no iframe embedding needed)"
```

---

## Ordre de déploiement recommandé

| # | Tâche | Risque déploiement | Impact |
|---|-------|-------------------|--------|
| 1 | Upload validation | Nul | Bloque uploads malveillants |
| 2 | Server action auth | Nul | Empêche mise à jour croisée de profils |
| 3 | Headers DENY | Nul | Bloque clickjacking |
| 4 | RLS Supabase | À tester en staging | Défense en profondeur |
| 5 | Rate limiting | Nécessite Upstash | Protège contre abus/DoS |

Tasks 1, 2, 3 peuvent être faites et deployées immédiatement.
Task 4 (RLS) : tester d'abord que l'app fonctionne après activation.
Task 5 (Rate limiting) : optionnel jusqu'à ce que l'app ait du trafic réel.
