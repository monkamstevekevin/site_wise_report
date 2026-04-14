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

-- ── materials ────────────────────────────────────────────────
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_org_isolation" ON public.materials
  USING (organization_id = auth_user_org_id());

-- ── test_types ───────────────────────────────────────────────
-- organizationId = null means a global shared template visible to all orgs
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_types_org_isolation" ON public.test_types
  USING (organization_id IS NULL OR organization_id = auth_user_org_id());

-- ── report_attachments ───────────────────────────────────────
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_attachments_org_isolation" ON public.report_attachments
  USING (organization_id = auth_user_org_id());

-- ── chat_messages ────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_org_isolation" ON public.chat_messages
  USING (organization_id = auth_user_org_id());

-- ============================================================
-- Vérification : toutes les tables doivent avoir rowsecurity=true
-- ============================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
