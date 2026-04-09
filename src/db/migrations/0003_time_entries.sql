CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "report_id" uuid REFERENCES "reports"("id") ON DELETE SET NULL,
  "date" timestamptz NOT NULL,
  "duration_minutes" numeric(8,2) NOT NULL,
  "notes" text,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "te_user_id_idx" ON "time_entries"("user_id");
CREATE INDEX IF NOT EXISTS "te_project_id_idx" ON "time_entries"("project_id");
CREATE INDEX IF NOT EXISTS "te_date_idx" ON "time_entries"("date");
CREATE INDEX IF NOT EXISTS "te_org_id_idx" ON "time_entries"("organization_id");
