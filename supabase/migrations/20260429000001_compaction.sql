-- 1. Add 'compaction' to material_type enum
ALTER TYPE material_type ADD VALUE IF NOT EXISTS 'compaction';

-- 2. Create compaction_test_rows table
CREATE TABLE IF NOT EXISTS "compaction_test_rows" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id"           uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
  "project_id"          uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "organization_id"     uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "row_order"           integer NOT NULL DEFAULT 0,
  -- RC-6304 quantitative fields
  "localisation"        text,
  "test_date"           date,
  "water_content"       numeric(6,2),    -- Teneur en eau (%)
  "dry_density"         numeric(8,2),    -- Masse volumique sèche (kg/m³)
  "retained_5mm"        numeric(6,2),    -- Retenu 5mm (%)
  "corrected_density"   numeric(8,2),    -- Masse volumique corrigée (kg/m³)
  "compaction_percent"  numeric(6,2),    -- % de compacité
  -- RC-6306 qualitative fields
  "material_ref"        text,            -- 'mat1' | 'mat2'
  "required_percent"    numeric(6,2),    -- % exigé
  "is_compliant"        boolean,         -- C (true) / NC (false)
  "sample_taken"        boolean,         -- Prélèvement O/N
  "sample_no"           text,            -- No Échantillons
  "remarks"             text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS "ctr_report_id_idx"   ON "compaction_test_rows"("report_id");
CREATE INDEX IF NOT EXISTS "ctr_project_id_idx"  ON "compaction_test_rows"("project_id");
CREATE INDEX IF NOT EXISTS "ctr_org_id_idx"      ON "compaction_test_rows"("organization_id");

-- 4. RLS
ALTER TABLE "compaction_test_rows" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read their compaction rows"
  ON "compaction_test_rows" FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "technicians can insert compaction rows"
  ON "compaction_test_rows" FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "technicians can update their compaction rows"
  ON "compaction_test_rows" FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins can delete compaction rows"
  ON "compaction_test_rows" FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
