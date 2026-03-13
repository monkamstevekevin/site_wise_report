/**
 * Migration : ajout des tables test_types et project_test_types
 * + colonnes test_type_id et test_data sur reports
 *
 * Usage: npx tsx --env-file=.env.local --tsconfig scripts/tsconfig.json scripts/migrate-test-types.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('pooler.supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
});

async function migrate() {
  const client = await pool.connect();
  console.log('🔧 Migration test_types...\n');

  try {
    await client.query('BEGIN');

    // 1. Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE test_category AS ENUM ('CONCRETE','SOIL','ASPHALT','GRANULAT','CEMENT','FIELD');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE test_field_type AS ENUM ('number','text','select','boolean');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('   ✓ Enums créés');

    // 2. Table test_types
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_types (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            TEXT NOT NULL,
        category        test_category NOT NULL,
        description     TEXT,
        fields          JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_default      BOOLEAN NOT NULL DEFAULT false,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS tt_org_id_idx     ON test_types(organization_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS tt_category_idx   ON test_types(category);`);
    console.log('   ✓ Table test_types créée');

    // 3. Table project_test_types
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_test_types (
        project_id   UUID NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
        test_type_id UUID NOT NULL REFERENCES test_types(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, test_type_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS ptt_project_id_idx ON project_test_types(project_id);`);
    console.log('   ✓ Table project_test_types créée');

    // 4. Colonnes sur reports
    await client.query(`
      ALTER TABLE reports
        ADD COLUMN IF NOT EXISTS test_type_id UUID REFERENCES test_types(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS test_data     JSONB;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS reports_test_type_id_idx ON reports(test_type_id);`);
    console.log('   ✓ Colonnes test_type_id + test_data ajoutées sur reports');

    await client.query('COMMIT');
    console.log('\n✅ Migration terminée avec succès !');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur, rollback effectué :', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
