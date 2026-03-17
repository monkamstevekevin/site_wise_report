/**
 * Seed des types de tests par défaut (organizationId = null → global)
 * Usage: npx tsx --env-file=.env.local --tsconfig scripts/tsconfig.json scripts/seed-test-types.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import type { TestFieldDef } from '../src/db/schema';
import { eq, isNull } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('pooler.supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// ─── Définitions ──────────────────────────────────────────────────────────────

type TestTypeSeed = {
  name: string;
  category: 'CONCRETE' | 'SOIL' | 'ASPHALT' | 'GRANULAT' | 'CEMENT' | 'FIELD';
  description: string;
  fields: TestFieldDef[];
};

const TEST_TYPES: TestTypeSeed[] = [
  // ── BÉTON ──────────────────────────────────────────────────────────────────

  {
    name: 'Affaissement (Slump Test)',
    category: 'CONCRETE',
    description: 'Mesure la consistance et la fluidité du béton frais selon ASTM C143 / CSA A23.2-5C.',
    fields: [
      { key: 'slump_mm',        label: 'Affaissement',             type: 'number', unit: 'mm',  min: 0, max: 300,  required: true,  hint: 'Mesurer au millimètre près' },
      { key: 'temperature_c',   label: 'Température du béton',     type: 'number', unit: '°C',  min: 5, max: 40,   required: true },
      { key: 'air_content_pct', label: 'Teneur en air',            type: 'number', unit: '%',   min: 0, max: 12,   required: true },
      { key: 'w_c_ratio',       label: 'Rapport eau/ciment',       type: 'number',              min: 0.3, max: 0.7, required: false },
      { key: 'batch_number',    label: 'Numéro de gâchée',         type: 'text',                required: true },
      { key: 'supplier',        label: 'Centrale à béton',         type: 'text',                required: true },
      { key: 'notes',           label: 'Observations',             type: 'text',                required: false },
    ],
  },

  {
    name: 'Résistance à la compression (Cylindres)',
    category: 'CONCRETE',
    description: 'Essai de compression sur cylindres selon ASTM C39 / CSA A23.2-9C. Résultats à 7 et 28 jours.',
    fields: [
      { key: 'batch_number',    label: 'Numéro de gâchée',         type: 'text',                required: true },
      { key: 'supplier',        label: 'Centrale à béton',         type: 'text',                required: true },
      { key: 'specimen_count',  label: 'Nombre de cylindres',      type: 'number', unit: 'cyl', min: 1, max: 6,  required: true },
      { key: 'diameter_mm',     label: 'Diamètre des cylindres',   type: 'select', required: true, options: ['100 mm', '150 mm'] },
      { key: 'temp_at_casting', label: 'Température au coulage',   type: 'number', unit: '°C', min: 5, max: 40,  required: true },
      { key: 'r7_mpa',          label: 'Résistance à 7 jours',     type: 'number', unit: 'MPa', min: 0, max: 80, required: false },
      { key: 'r28_mpa',         label: 'Résistance à 28 jours',    type: 'number', unit: 'MPa', min: 0, max: 80, required: false },
      { key: 'slump_mm',        label: 'Affaissement',             type: 'number', unit: 'mm',  min: 0, max: 300, required: true },
      { key: 'air_content_pct', label: 'Teneur en air',            type: 'number', unit: '%',   min: 0, max: 12, required: true },
      { key: 'notes',           label: 'Observations',             type: 'text',                required: false },
    ],
  },

  {
    name: 'Masse volumique du béton frais',
    category: 'CONCRETE',
    description: 'Détermination de la masse volumique du béton frais selon ASTM C138.',
    fields: [
      { key: 'batch_number',      label: 'Numéro de gâchée',          type: 'text',                 required: true },
      { key: 'container_vol_l',   label: 'Volume du contenant',        type: 'number', unit: 'L',    required: true },
      { key: 'gross_mass_kg',     label: 'Masse brute',                type: 'number', unit: 'kg',   required: true },
      { key: 'tare_kg',           label: 'Tare du contenant',          type: 'number', unit: 'kg',   required: true },
      { key: 'density_kg_m3',     label: 'Masse volumique calculée',   type: 'number', unit: 'kg/m³', required: false, hint: 'Calculé automatiquement' },
      { key: 'temperature_c',     label: 'Température du béton',       type: 'number', unit: '°C',   required: true },
      { key: 'notes',             label: 'Observations',               type: 'text',                 required: false },
    ],
  },

  // ── SOLS ───────────────────────────────────────────────────────────────────

  {
    name: 'Essai Proctor Standard',
    category: 'SOIL',
    description: 'Détermine la densité sèche maximale et la teneur en eau optimale selon ASTM D698 / BNQ.',
    fields: [
      { key: 'sample_id',           label: 'Identifiant de l\'échantillon', type: 'text',                required: true },
      { key: 'soil_description',    label: 'Description du sol',            type: 'text',                required: true },
      { key: 'max_dry_density',     label: 'Densité sèche maximale (DMR)',  type: 'number', unit: 'kg/m³', min: 1400, max: 2200, required: true },
      { key: 'optimum_moisture_pct',label: 'Teneur en eau optimale (TWO)', type: 'number', unit: '%',    min: 5, max: 30, required: true },
      { key: 'in_situ_density',     label: 'Densité in-situ mesurée',       type: 'number', unit: 'kg/m³', required: false },
      { key: 'in_situ_moisture',    label: 'Humidité in-situ',              type: 'number', unit: '%',    required: false },
      { key: 'compaction_pct',      label: 'Taux de compaction',            type: 'number', unit: '%',    min: 85, max: 105, required: false, hint: 'Densité in-situ / DMR × 100' },
      { key: 'notes',               label: 'Observations',                  type: 'text',                required: false },
    ],
  },

  {
    name: 'Analyse granulométrique (Sol)',
    category: 'SOIL',
    description: 'Distribution des tailles de particules par tamisage selon ASTM D422 / D6913.',
    fields: [
      { key: 'sample_id',       label: 'Identifiant',               type: 'text',                required: true },
      { key: 'total_mass_g',    label: 'Masse totale de l\'échantillon', type: 'number', unit: 'g', required: true },
      { key: 'passing_50mm',    label: 'Passant 50 mm',             type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_20mm',    label: 'Passant 20 mm',             type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_5mm',     label: 'Passant 5 mm (No. 4)',      type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'passing_2mm',     label: 'Passant 2 mm (No. 10)',     type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'passing_425um',   label: 'Passant 425 µm (No. 40)',   type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'passing_75um',    label: 'Passant 75 µm (No. 200)',   type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'classification',  label: 'Classification USCS',       type: 'text',                required: false },
      { key: 'notes',           label: 'Observations',              type: 'text',                required: false },
    ],
  },

  {
    name: 'Limites d\'Atterberg',
    category: 'SOIL',
    description: 'Limite liquide (LL) et limite plastique (LP) selon ASTM D4318.',
    fields: [
      { key: 'sample_id',         label: 'Identifiant',          type: 'text',                required: true },
      { key: 'liquid_limit',      label: 'Limite liquide (LL)',   type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'plastic_limit',     label: 'Limite plastique (LP)', type: 'number', unit: '%', min: 0, max: 60,  required: true },
      { key: 'plasticity_index',  label: 'Indice de plasticité (IP)', type: 'number',          required: false, hint: 'LL - LP' },
      { key: 'notes',             label: 'Observations',          type: 'text',                required: false },
    ],
  },

  {
    name: 'Densité in-situ (Jauge nucléaire)',
    category: 'SOIL',
    description: 'Mesure la densité et l\'humidité du sol en place selon ASTM D2922 / D3017.',
    fields: [
      { key: 'location',          label: 'Emplacement / station',    type: 'text',                required: true },
      { key: 'depth_cm',          label: 'Profondeur de mesure',     type: 'number', unit: 'cm',  required: true },
      { key: 'wet_density',       label: 'Densité humide',           type: 'number', unit: 'kg/m³', required: true },
      { key: 'moisture_pct',      label: 'Teneur en eau',            type: 'number', unit: '%',   required: true },
      { key: 'dry_density',       label: 'Densité sèche',            type: 'number', unit: 'kg/m³', required: false, hint: 'Calculé automatiquement' },
      { key: 'reference_density', label: 'Densité de référence (DMR)', type: 'number', unit: 'kg/m³', required: true },
      { key: 'compaction_pct',    label: 'Taux de compaction',       type: 'number', unit: '%',   required: false },
      { key: 'pass_fail',         label: 'Résultat',                 type: 'select', required: true, options: ['Conforme', 'Non-conforme', 'À vérifier'] },
      { key: 'notes',             label: 'Observations',             type: 'text',                required: false },
    ],
  },

  {
    name: 'CBR (California Bearing Ratio)',
    category: 'SOIL',
    description: 'Capacité portante du sol selon ASTM D1883.',
    fields: [
      { key: 'sample_id',     label: 'Identifiant',              type: 'text',                required: true },
      { key: 'cbr_pct',       label: 'Valeur CBR',               type: 'number', unit: '%', min: 0, max: 200, required: true },
      { key: 'penetration_mm',label: 'Pénétration mesurée',       type: 'number', unit: 'mm',  required: true },
      { key: 'swell_pct',     label: 'Gonflement après immersion', type: 'number', unit: '%',  required: false },
      { key: 'compaction_pct',label: 'Taux de compaction de l\'éprouvette', type: 'number', unit: '%', required: true },
      { key: 'notes',         label: 'Observations',             type: 'text',                required: false },
    ],
  },

  // ── ASPHALTE ───────────────────────────────────────────────────────────────

  {
    name: 'Extraction de carottes (Asphalte)',
    category: 'ASPHALT',
    description: 'Vérification de l\'épaisseur, de la densité et de la composition des couches d\'enrobé en place.',
    fields: [
      { key: 'station',         label: 'Station / emplacement',      type: 'text',                required: true },
      { key: 'layer',           label: 'Couche',                     type: 'select', required: true, options: ['Fondation', 'Base', 'Liaison', 'Surface'] },
      { key: 'thickness_mm',    label: 'Épaisseur mesurée',          type: 'number', unit: 'mm',   min: 0, max: 400, required: true },
      { key: 'required_thickness', label: 'Épaisseur requise',       type: 'number', unit: 'mm',   required: true },
      { key: 'bulk_density',    label: 'Densité bulk',               type: 'number', unit: 'kg/m³', min: 2000, max: 2600, required: true },
      { key: 'max_density',     label: 'Densité maximale (DMT)',     type: 'number', unit: 'kg/m³', required: true },
      { key: 'air_voids_pct',   label: 'Teneur en vides',            type: 'number', unit: '%',    min: 0, max: 15,  required: true },
      { key: 'bitumen_content', label: 'Teneur en bitume',           type: 'number', unit: '%',    min: 3, max: 8,   required: false },
      { key: 'notes',           label: 'Observations',               type: 'text',                 required: false },
    ],
  },

  {
    name: 'Densité et compaction de l\'enrobé (Nuclear gauge)',
    category: 'ASPHALT',
    description: 'Mesure de la densité et du taux de compaction de l\'enrobé en place.',
    fields: [
      { key: 'station',             label: 'Station / emplacement',       type: 'text',                required: true },
      { key: 'temperature_surface', label: 'Température de surface',       type: 'number', unit: '°C',  required: true },
      { key: 'temperature_air',     label: 'Température de l\'air',        type: 'number', unit: '°C',  required: true },
      { key: 'density_measured',    label: 'Densité mesurée',              type: 'number', unit: 'kg/m³', min: 2000, max: 2600, required: true },
      { key: 'reference_density',   label: 'Densité de référence (DMT)',   type: 'number', unit: 'kg/m³', required: true },
      { key: 'compaction_pct',      label: 'Taux de compaction',           type: 'number', unit: '%',    min: 90, max: 105, required: true },
      { key: 'number_of_passes',    label: 'Nombre de passes compacteur',  type: 'number',               required: false },
      { key: 'pass_fail',           label: 'Résultat',                     type: 'select', required: true, options: ['Conforme', 'Non-conforme', 'À revérifier'] },
      { key: 'notes',               label: 'Observations',                 type: 'text',                 required: false },
    ],
  },

  {
    name: 'Mise en oeuvre de l\'enrobé (Chantier)',
    category: 'ASPHALT',
    description: 'Contrôle de la mise en place de l\'enrobé bitumineux : température, épandage, compactage.',
    fields: [
      { key: 'batch_number',        label: 'Numéro de lot / bon de livraison', type: 'text',              required: true },
      { key: 'supplier',            label: 'Centrale d\'enrobage',            type: 'text',               required: true },
      { key: 'mix_type',            label: 'Type d\'enrobé',                  type: 'text',               required: true, hint: 'ex: EB-10, EB-14, ESG-10' },
      { key: 'temperature_truck',   label: 'Temp. à la livraison (camion)',   type: 'number', unit: '°C', min: 100, max: 200, required: true },
      { key: 'temperature_paving',  label: 'Temp. à la mise en oeuvre',       type: 'number', unit: '°C', min: 100, max: 200, required: true },
      { key: 'air_temperature',     label: 'Température de l\'air',           type: 'number', unit: '°C', required: true },
      { key: 'spread_rate',         label: 'Taux d\'épandage',                type: 'number', unit: 'kg/m²', required: false },
      { key: 'thickness_target_mm', label: 'Épaisseur visée',                 type: 'number', unit: 'mm', required: true },
      { key: 'rolling_pattern',     label: 'Atelier de compactage',           type: 'text',               required: false },
      { key: 'notes',               label: 'Observations',                    type: 'text',               required: false },
    ],
  },

  // ── GRANULATS ──────────────────────────────────────────────────────────────

  {
    name: 'Analyse granulométrique (Granulats)',
    category: 'GRANULAT',
    description: 'Courbe granulométrique des granulats par tamisage selon ASTM C136 / CSA A23.2-2A.',
    fields: [
      { key: 'material_id',   label: 'Identification du matériau',    type: 'text',                required: true },
      { key: 'supplier',      label: 'Fournisseur / carrière',         type: 'text',                required: true },
      { key: 'total_mass_g',  label: 'Masse de l\'essai',              type: 'number', unit: 'g',   required: true },
      { key: 'passing_25mm',  label: 'Passant 25 mm',                  type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_20mm',  label: 'Passant 20 mm',                  type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_14mm',  label: 'Passant 14 mm',                  type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_10mm',  label: 'Passant 10 mm',                  type: 'number', unit: '%', min: 0, max: 100, required: false },
      { key: 'passing_5mm',   label: 'Passant 5 mm',                   type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'passing_2_5mm', label: 'Passant 2,5 mm',                 type: 'number', unit: '%', min: 0, max: 100, required: true },
      { key: 'passing_80um',  label: 'Passant 80 µm (fines)',          type: 'number', unit: '%', min: 0, max: 15,  required: true },
      { key: 'fm',            label: 'Module de finesse (MF)',          type: 'number',              min: 1, max: 4, required: false },
      { key: 'notes',         label: 'Observations',                   type: 'text',                required: false },
    ],
  },

  {
    name: 'Masse volumique et absorption (Granulats)',
    category: 'GRANULAT',
    description: 'Masse volumique absolue et taux d\'absorption selon ASTM C127 (gros granulats) / C128 (sable).',
    fields: [
      { key: 'material_id',    label: 'Identification',                type: 'text',                required: true },
      { key: 'fraction',       label: 'Fraction',                      type: 'select', required: true, options: ['Gros granulat (> 5mm)', 'Sable (< 5mm)'] },
      { key: 'ssd_density',    label: 'Masse volumique SSD',           type: 'number', unit: 'kg/m³', min: 2400, max: 3000, required: true },
      { key: 'abs_density',    label: 'Masse volumique absolue',       type: 'number', unit: 'kg/m³', min: 2400, max: 3000, required: true },
      { key: 'bulk_density',   label: 'Masse volumique en vrac',       type: 'number', unit: 'kg/m³', required: false },
      { key: 'absorption_pct', label: 'Absorption',                    type: 'number', unit: '%',    min: 0, max: 5, required: true },
      { key: 'notes',          label: 'Observations',                  type: 'text',                 required: false },
    ],
  },

  // ── CIMENT ─────────────────────────────────────────────────────────────────

  {
    name: 'Temps de prise du ciment',
    category: 'CEMENT',
    description: 'Mesure des temps de prise initiale et finale selon ASTM C191.',
    fields: [
      { key: 'cement_type',     label: 'Type de ciment',               type: 'text',                required: true, hint: 'ex: GU, HE, MH, LH' },
      { key: 'lot_number',      label: 'Numéro de lot',                type: 'text',                required: true },
      { key: 'initial_set_min', label: 'Temps de prise initiale',      type: 'number', unit: 'min', min: 45,  max: 600, required: true },
      { key: 'final_set_min',   label: 'Temps de prise finale',        type: 'number', unit: 'min', min: 100, max: 600, required: true },
      { key: 'normal_consistency_pct', label: 'Consistance normale',   type: 'number', unit: '%',  min: 20, max: 35, required: false },
      { key: 'test_temperature', label: 'Température du laboratoire',  type: 'number', unit: '°C', min: 20, max: 27, required: true },
      { key: 'notes',           label: 'Observations',                 type: 'text',                required: false },
    ],
  },

  // ── TERRAIN ────────────────────────────────────────────────────────────────

  {
    name: 'Inspection visuelle – Terrain',
    category: 'FIELD',
    description: 'Rapport d\'inspection visuelle générale sur le chantier.',
    fields: [
      { key: 'location',        label: 'Emplacement inspecté',         type: 'text',                required: true },
      { key: 'weather',         label: 'Conditions météo',             type: 'select', required: true, options: ['Ensoleillé', 'Nuageux', 'Pluie légère', 'Pluie forte', 'Neige', 'Froid (< 5°C)'] },
      { key: 'temperature_air', label: 'Température de l\'air',        type: 'number', unit: '°C',  required: true },
      { key: 'work_in_progress',label: 'Travaux en cours',             type: 'text',                required: true },
      { key: 'conformities',    label: 'Points conformes',             type: 'text',                required: false },
      { key: 'non_conformities',label: 'Non-conformités observées',    type: 'text',                required: false },
      { key: 'corrective_actions', label: 'Actions correctives',       type: 'text',                required: false },
      { key: 'photos_taken',    label: 'Photos prises',                type: 'boolean',             required: false },
      { key: 'notes',           label: 'Observations générales',       type: 'text',                required: false },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedTestTypes() {
  console.log('🧪 Seed des types de tests par défaut...\n');

  // Supprimer les anciens défauts
  await db.delete(schema.testTypes).where(isNull(schema.testTypes.organizationId));
  console.log('   ↩  Anciens types globaux supprimés');

  let count = 0;
  for (const tt of TEST_TYPES) {
    await db.insert(schema.testTypes).values({
      name: tt.name,
      category: tt.category,
      description: tt.description,
      fields: tt.fields,
      isDefault: true,
      organizationId: null,
    });
    console.log(`   ✓ [${tt.category.padEnd(8)}] ${tt.name}`);
    count++;
  }

  console.log(`\n✅ ${count} types de tests créés avec succès !`);
  await pool.end();
}

seedTestTypes().catch((err) => {
  console.error('❌ Erreur :', err?.message ?? err);
  process.exit(1);
});
