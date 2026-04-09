DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_type') THEN
    CREATE TYPE "project_type" AS ENUM ('VISITS', 'HOURS', 'OPEN');
  END IF;
END $$;

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "project_type" project_type NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "target_visits" numeric(6,0),
  ADD COLUMN IF NOT EXISTS "target_hours" numeric(8,2);
