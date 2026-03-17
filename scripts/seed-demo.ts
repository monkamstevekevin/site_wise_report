/**
 * Script de seed démo — compte complet avec données réalistes
 * Crée une organisation + 4 utilisateurs Supabase Auth + projets + rapports
 *
 * Usage:
 *   npx tsx --tsconfig scripts/tsconfig.json scripts/seed-demo.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as schema from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// ─── DB ───────────────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('pooler.supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
});
const db = drizzle(pool, { schema });

// ─── Supabase Admin ───────────────────────────────────────────────────────────

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400_000);

function generateSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${base}-${randomBytes(3).toString('hex')}`;
}

/**
 * Crée ou récupère un utilisateur Supabase Auth, puis crée/met à jour le profil public.users
 */
async function upsertUser(params: {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN';
  organizationId: string;
}): Promise<string> {
  // Supprimer l'ancien profil public si existant (même email)
  await db.delete(schema.users).where(eq(schema.users.email, params.email));

  // Créer l'utilisateur Auth (ignore si déjà existant dans auth.users)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { name: params.name },
  });

  let uid: string;

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
      // L'utilisateur existe déjà dans auth — on récupère son id
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === params.email);
      if (!existing) throw new Error(`Impossible de récupérer l'uid pour ${params.email}`);
      uid = existing.id;
      // Mettre à jour le mot de passe
      await supabaseAdmin.auth.admin.updateUserById(uid, { password: params.password });
    } else {
      throw new Error(`Auth error for ${params.email}: ${authError.message}`);
    }
  } else {
    uid = authData.user!.id;
  }

  // Insérer le profil public
  await db.insert(schema.users).values({
    id: uid,
    email: params.email,
    name: params.name,
    role: params.role,
    organizationId: params.organizationId,
  });

  return uid;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log('🌱 Seed démo SiteWise Reports — Béton Québec Construction\n');

  // ── 1. Organisation ────────────────────────────────────────────────────────
  console.log('🏢 Création de l\'organisation...');

  // Supprimer l'ancienne org démo si elle existe
  const existingOrg = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.name, 'Béton Québec Construction Inc.'))
    .limit(1);

  let orgId: string;

  if (existingOrg.length > 0) {
    orgId = existingOrg[0].id;
    console.log(`   ↩  Organisation existante réutilisée (id: ${orgId})`);
  } else {
    const trialEndsAt = daysFromNow(14);
    const [org] = await db
      .insert(schema.organizations)
      .values({
        name: 'Béton Québec Construction Inc.',
        slug: generateSlug('Béton Québec Construction'),
        plan: 'PRO',
        subscriptionStatus: 'ACTIVE',
        trialEndsAt,
        inviteToken: randomBytes(24).toString('hex'),
      })
      .returning();
    orgId = org.id;
    console.log(`   ✓ Organisation créée (id: ${orgId})`);
  }

  // ── 2. Utilisateurs ────────────────────────────────────────────────────────
  console.log('\n👤 Création des utilisateurs...');

  const USERS = [
    { email: 'demo@sitewise.app',          password: 'Demo1234!', name: 'Marie Tremblay',    role: 'ADMIN'      as const },
    { email: 'superviseur@sitewise.app',   password: 'Demo1234!', name: 'Jean-François Roy', role: 'SUPERVISOR' as const },
    { email: 'technicien1@sitewise.app',   password: 'Demo1234!', name: 'Kevin Gagnon',      role: 'TECHNICIAN' as const },
    { email: 'technicien2@sitewise.app',   password: 'Demo1234!', name: 'Sophie Lavoie',     role: 'TECHNICIAN' as const },
  ];

  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    const uid = await upsertUser({ ...u, organizationId: orgId });
    userIds[u.email] = uid;
    console.log(`   ✓ ${u.role.padEnd(12)} ${u.name.padEnd(22)} <${u.email}>`);
  }

  const adminId  = userIds['demo@sitewise.app'];
  const supId    = userIds['superviseur@sitewise.app'];
  const tech1Id  = userIds['technicien1@sitewise.app'];
  const tech2Id  = userIds['technicien2@sitewise.app'];

  // ── 3. Matériaux ───────────────────────────────────────────────────────────
  console.log('\n📦 Création des matériaux...');

  // Supprimer les anciens matériaux de cette org
  await db.delete(schema.materials).where(eq(schema.materials.organizationId, orgId));

  const materialsData = [
    { name: 'Ciment Portland GU',     type: 'cement'  as const, minDensity: '1400', maxDensity: '1600', minTemperature: '5',   maxTemperature: '35',  organizationId: orgId },
    { name: 'Enrobé bitumineux EB-20', type: 'asphalt' as const, minDensity: '2200', maxDensity: '2500', minTemperature: '130', maxTemperature: '165', organizationId: orgId },
    { name: 'Granulat 20/40',         type: 'gravel'  as const, minDensity: '1550', maxDensity: '1750', minTemperature: '5',   maxTemperature: '45',  organizationId: orgId },
    { name: 'Sable de rivière 0/4',   type: 'sand'    as const, minDensity: '1500', maxDensity: '1700', minTemperature: '5',   maxTemperature: '40',  organizationId: orgId },
    { name: 'Béton C25/30 prêt à l\'emploi', type: 'other' as const, minDensity: '2300', maxDensity: '2450', minTemperature: '5', maxTemperature: '30', organizationId: orgId },
  ];

  const insertedMaterials = await db.insert(schema.materials).values(materialsData).returning();
  const matByType: Record<string, string> = {};
  insertedMaterials.forEach((m) => { matByType[m.type] = m.id; });
  console.log(`   ✓ ${insertedMaterials.length} matériaux créés`);

  // ── 4. Projets ─────────────────────────────────────────────────────────────
  console.log('\n🏗️  Création des projets...');

  // Supprimer les anciens projets de cette org (cascade sur rapports, assignments)
  const oldProjects = await db.select().from(schema.projects).where(eq(schema.projects.organizationId, orgId));
  for (const p of oldProjects) {
    await db.delete(schema.reports).where(eq(schema.reports.projectId, p.id));
    await db.delete(schema.userAssignments).where(eq(schema.userAssignments.projectId, p.id));
    await db.delete(schema.projectMaterials).where(eq(schema.projectMaterials.projectId, p.id));
    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.projectId, p.id));
  }
  await db.delete(schema.projects).where(eq(schema.projects.organizationId, orgId));

  const projectsData = [
    {
      name: 'Autoroute 40 — Élargissement Montréal-Est',
      location: 'Montréal, QC',
      description: 'Élargissement de 18 km de l\'autoroute 40 entre Repentigny et Montréal-Est. Ajout de 2 voies réversibles et réfection complète de la chaussée.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(60),
      endDate: daysFromNow(180),
      organizationId: orgId,
    },
    {
      name: 'Pont Champlain — Voie de service',
      location: 'Montréal / Brossard, QC',
      description: 'Construction de la voie de service sur le pont Champlain: fondations, tablier béton et enrobé de surface sur 2,3 km.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(25),
      endDate: daysFromNow(210),
      organizationId: orgId,
    },
    {
      name: 'Route 132 — Reconstruction Longueuil',
      location: 'Longueuil, QC',
      description: 'Reconstruction de 4 km de la route 132: démolition de la chaussée existante, drainage, sous-fondation, fondation et revêtement en enrobé.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(12),
      endDate: daysFromNow(95),
      organizationId: orgId,
    },
    {
      name: 'Boulevard Taschereau — Phase 1',
      location: 'Brossard, QC',
      description: 'Réfection du boulevard Taschereau entre le chemin Lapinière et la rue Pelletier. Travaux complétés.',
      status: 'COMPLETED' as const,
      startDate: daysAgo(200),
      endDate: daysAgo(20),
      organizationId: orgId,
    },
  ];

  const insertedProjects = await db.insert(schema.projects).values(projectsData).returning();
  const [proj1, proj2, proj3, proj4] = insertedProjects;
  console.log(`   ✓ ${insertedProjects.length} projets créés`);

  // ── 5. Matériaux ↔ Projets ─────────────────────────────────────────────────
  console.log('\n🔗 Association matériaux ↔ projets...');
  const matIds = Object.values(matByType);
  for (const project of insertedProjects) {
    for (const materialId of matIds) {
      await db.insert(schema.projectMaterials)
        .values({ projectId: project.id, materialId })
        .onConflictDoNothing();
    }
  }
  console.log('   ✓ Matériaux associés');

  // ── 6. Assignations utilisateurs ↔ projets ─────────────────────────────────
  console.log('\n👷 Assignations utilisateurs ↔ projets...');

  const assignments = [
    // Projet 1 — A-40
    { userId: supId,   projectId: proj1.id, assignmentType: 'FULL_TIME'  as const, organizationId: orgId },
    { userId: tech1Id, projectId: proj1.id, assignmentType: 'FULL_TIME'  as const, organizationId: orgId },
    { userId: tech2Id, projectId: proj1.id, assignmentType: 'PART_TIME'  as const, organizationId: orgId },
    // Projet 2 — Pont Champlain
    { userId: supId,   projectId: proj2.id, assignmentType: 'PART_TIME'  as const, organizationId: orgId },
    { userId: tech1Id, projectId: proj2.id, assignmentType: 'PART_TIME'  as const, organizationId: orgId },
    // Projet 3 — Route 132
    { userId: supId,   projectId: proj3.id, assignmentType: 'PART_TIME'  as const, organizationId: orgId },
    { userId: tech2Id, projectId: proj3.id, assignmentType: 'FULL_TIME'  as const, organizationId: orgId },
    // Projet 4 — Taschereau (terminé)
    { userId: tech1Id, projectId: proj4.id, assignmentType: 'FULL_TIME'  as const, organizationId: orgId },
    { userId: tech2Id, projectId: proj4.id, assignmentType: 'FULL_TIME'  as const, organizationId: orgId },
  ];

  for (const a of assignments) {
    await db.insert(schema.userAssignments).values(a).onConflictDoNothing();
  }
  console.log(`   ✓ ${assignments.length} assignations créées`);

  // ── 7a. Types de tests associés aux projets ────────────────────────────────
  console.log('\n🔬 Association des types de tests aux projets...');

  const allTestTypes = await db.select().from(schema.testTypes);
  const ttByName: Record<string, string> = {};
  allTestTypes.forEach(tt => { ttByName[tt.name] = tt.id; });

  const slumpId    = ttByName['Affaissement (Slump Test)'] ?? null;
  const proctorId  = ttByName['Essai Proctor Standard']    ?? null;
  const cylId      = ttByName['Résistance à la compression (Cylindres)'] ?? null;

  const ptEntries = [
    slumpId  && { projectId: proj2.id, testTypeId: slumpId  },
    cylId    && { projectId: proj2.id, testTypeId: cylId    },
    proctorId && { projectId: proj3.id, testTypeId: proctorId },
    slumpId  && { projectId: proj1.id, testTypeId: slumpId  },
  ].filter(Boolean) as { projectId: string; testTypeId: string }[];

  for (const entry of ptEntries) {
    await db.insert(schema.projectTestTypes).values(entry).onConflictDoNothing();
  }
  console.log(`   ✓ ${ptEntries.length} association(s) créées`);

  // ── 7b. Rapports ───────────────────────────────────────────────────────────
  console.log('\n📋 Création des rapports...');

  type ReportInsert = typeof schema.reports.$inferInsert;

  const reportsData: ReportInsert[] = [
    // ── Projet 1 — Autoroute 40 ──────────────────────────────────────────────
    {
      projectId: proj1.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '151.0', volume: '46.5', density: '2335.0', humidity: '0.7',
      batchNumber: 'LOT-ENR-2025-001', supplier: 'Eurovia Québec',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Température de pose conforme. Compactage atteint après 8 passes. Densité in-situ mesurée à 2330 kg/m³.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Toutes les mesures sont dans les plages de tolérance. Rapport conforme.',
      createdAt: daysAgo(55), updatedAt: daysAgo(53),
    },
    {
      projectId: proj1.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '158.0', volume: '42.0', density: '2295.0', humidity: '0.5',
      batchNumber: 'LOT-ENR-2025-002', supplier: 'Eurovia Québec',
      samplingMethod: 'composite', status: 'VALIDATED',
      notes: 'Bonne mise en œuvre. Pente d\'écoulement respectée.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Paramètres conformes aux spécifications du marché.',
      createdAt: daysAgo(48), updatedAt: daysAgo(46),
    },
    {
      projectId: proj1.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'gravel', temperature: '16.0', volume: '130.0', density: '1665.0', humidity: '3.0',
      batchNumber: 'LOT-GRV-2025-001', supplier: 'Carrières Rivière-Beaudette',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Granulométrie conforme. Indice de plasticité IP < 6.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Valeurs dans la plage normale.',
      createdAt: daysAgo(42), updatedAt: daysAgo(40),
    },
    {
      projectId: proj1.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '174.0', volume: '39.8', density: '2175.0', humidity: '0.3',
      batchNumber: 'LOT-ENR-2025-003', supplier: 'Colas Québec',
      samplingMethod: 'grab', status: 'REJECTED',
      rejectionReason: 'Température de pose hors norme (174°C > 165°C max). Risque de vieillissement prématuré du bitume. Corriger la température de centrale avant la prochaine livraison.',
      aiIsAnomalous: true,
      aiAnomalyExplanation: 'ANOMALIE DÉTECTÉE : La température de 174°C dépasse le seuil maximal de 165°C. Un enrobé surchauffé perd ses propriétés liantes, causant fragilité et fissuration prématurée. Lot à refuser.',
      createdAt: daysAgo(36), updatedAt: daysAgo(34),
    },
    {
      projectId: proj1.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '153.0', volume: '41.2', density: '2320.0', humidity: '0.6',
      batchNumber: 'LOT-ENR-2025-003B', supplier: 'Colas Québec',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Lot corrigé suite au rejet. Température centrale ajustée. Résultats conformes.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Température revenues dans la plage acceptable. Aucune anomalie détectée.',
      createdAt: daysAgo(32), updatedAt: daysAgo(30),
    },
    {
      projectId: proj1.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '149.0', volume: '50.1', density: '2345.0', humidity: '0.8',
      batchNumber: 'LOT-ENR-2025-004', supplier: 'Eurovia Québec',
      samplingMethod: 'composite', status: 'SUBMITTED',
      notes: 'Couche de surface en cours de validation. Joints longitudinaux soignés.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Aucune anomalie. Rapport prêt pour validation superviseur.',
      createdAt: daysAgo(8), updatedAt: daysAgo(8),
    },

    // ── Projet 2 — Pont Champlain ─────────────────────────────────────────────
    {
      projectId: proj2.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'cement', temperature: '21.0', volume: '30.0', density: '1490.0', humidity: '6.2',
      batchNumber: 'LOT-CIM-2025-001', supplier: 'Lafarge Canada',
      samplingMethod: 'composite', status: 'VALIDATED',
      notes: 'Résistance à 28 jours R28 = 36 MPa. Conforme normes MTQ.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Paramètres dans les normes. Ciment de qualité.',
      createdAt: daysAgo(22), updatedAt: daysAgo(20),
    },
    {
      projectId: proj2.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'other', temperature: '19.0', volume: '18.0', density: '2390.0', humidity: '4.0',
      batchNumber: 'LOT-BET-2025-001', supplier: 'Béton Provincial',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Affaissement 90mm. Teneur en air 5,8%. Conforme devis structural.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Béton conforme aux exigences de durabilité.',
      testTypeId: slumpId,
      testData: slumpId ? { slump_mm: '90', temperature_c: '19', air_content_pct: '5.8', w_c_ratio: '0.45', batch_number: 'G-2025-023', supplier: 'Béton Provincial', notes: 'Conforme devis structural P-30 MRC' } : null,
      createdAt: daysAgo(18), updatedAt: daysAgo(16),
    },
    {
      projectId: proj2.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'cement', temperature: '7.0', volume: '25.0', density: '1385.0', humidity: '8.1',
      batchNumber: 'LOT-CIM-2025-002', supplier: 'Lafarge Canada',
      samplingMethod: 'composite', status: 'SUBMITTED',
      notes: 'Température ambiante basse ce matin (-3°C). Coffrage chauffé. Surveillance 48h prévue.',
      aiIsAnomalous: true,
      aiAnomalyExplanation: 'ATTENTION : Température de 7°C proche du seuil minimal (5°C). Conditions hivernales — risque de ralentissement de la prise. Surveillance renforcée recommandée. Protéger contre le gel 72h.',
      createdAt: daysAgo(10), updatedAt: daysAgo(10),
    },
    {
      projectId: proj2.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'other', temperature: '18.5', volume: '22.0', density: '2375.0', humidity: '4.5',
      batchNumber: 'LOT-BET-2025-002', supplier: 'Béton Provincial',
      samplingMethod: 'composite', status: 'SUBMITTED',
      notes: 'Coulée des longrines. Vibration au pervibrateur. Bon remplissage coffrage.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Aucune anomalie. Conditions de bétonnage normales.',
      testTypeId: slumpId,
      testData: slumpId ? { slump_mm: '85', temperature_c: '18.5', air_content_pct: '6.1', w_c_ratio: '0.44', batch_number: 'G-2025-031', supplier: 'Béton Provincial', notes: 'Longrines axe B. Bonne fluidité.' } : null,
      createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },

    // ── Projet 3 — Route 132 ──────────────────────────────────────────────────
    {
      projectId: proj3.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'sand', temperature: '17.5', volume: '90.0', density: '1615.0', humidity: '4.9',
      batchNumber: 'LOT-SAB-2025-001', supplier: 'Sablières de Montréal',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Équivalent de sable ES = 78. Module de finesse MF = 2.6. Conforme.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Granulométrie et humidité dans les normes.',
      createdAt: daysAgo(10), updatedAt: daysAgo(8),
    },
    {
      projectId: proj3.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'gravel', temperature: '18.0', volume: '100.0', density: '1690.0', humidity: '2.5',
      batchNumber: 'LOT-GRV-2025-002', supplier: 'Carrières Rivière-Beaudette',
      samplingMethod: 'composite', status: 'SUBMITTED',
      notes: 'Couche de fondation granulaire MG-20. Mise en place en 2 couches de 15 cm.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Valeurs normales. Granulat bien gradué.',
      testTypeId: proctorId,
      testData: proctorId ? { sample_id: 'ECH-MG20-001', soil_description: 'MG-20 concassé calcaire, Carrière Beaudette', max_dry_density: '2150', optimum_moisture_pct: '6.2', in_situ_density: '2082', in_situ_moisture: '5.8', compaction_pct: '96.8', notes: 'Couche 1 de 2 — station 0+380' } : null,
      createdAt: daysAgo(4), updatedAt: daysAgo(4),
    },
    {
      projectId: proj3.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '147.0', volume: '55.0', density: '2308.0', humidity: '0.5',
      batchNumber: 'LOT-ENR-2025-005', supplier: 'Eurovia Québec',
      samplingMethod: 'grab', status: 'DRAFT',
      notes: 'Première couche de base. Vérification du compactage demain matin.',
      createdAt: daysAgo(2), updatedAt: daysAgo(2),
    },
    {
      projectId: proj3.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'gravel', temperature: '16.5', volume: '75.0', density: '1720.0', humidity: '2.2',
      batchNumber: 'LOT-GRV-2025-003', supplier: 'Carrières Rivière-Beaudette',
      samplingMethod: 'grab', status: 'DRAFT',
      notes: 'Prélèvement effectué. Résultats laboratoire attendus vendredi.',
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },

    // ── Projet 4 — Taschereau (terminé) ──────────────────────────────────────
    {
      projectId: proj4.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'asphalt', temperature: '154.0', volume: '70.0', density: '2360.0', humidity: '0.6',
      batchNumber: 'LOT-ENR-2024-020', supplier: 'Colas Québec',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Dernier lot du chantier. Qualité excellente. Réception provisoire accordée.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Paramètres optimaux. Excellent travail.',
      createdAt: daysAgo(28), updatedAt: daysAgo(26),
    },
    {
      projectId: proj4.id, technicianId: tech2Id, organizationId: orgId,
      materialType: 'gravel', temperature: '15.0', volume: '220.0', density: '1710.0', humidity: '2.0',
      batchNumber: 'LOT-GRV-2024-015', supplier: 'Carrières Rivière-Beaudette',
      samplingMethod: 'core', status: 'VALIDATED',
      notes: 'Couche de fondation granulaire finale. Épaisseur conforme 20 cm.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Valeurs normales.',
      createdAt: daysAgo(35), updatedAt: daysAgo(33),
    },
    {
      projectId: proj4.id, technicianId: tech1Id, organizationId: orgId,
      materialType: 'sand', temperature: '14.0', volume: '110.0', density: '1595.0', humidity: '5.5',
      batchNumber: 'LOT-SAB-2024-010', supplier: 'Sablières de Montréal',
      samplingMethod: 'grab', status: 'VALIDATED',
      notes: 'Sous-fondation complétée. Profilage conforme.',
      aiIsAnomalous: false,
      aiAnomalyExplanation: 'Aucune anomalie.',
      createdAt: daysAgo(45), updatedAt: daysAgo(43),
    },
  ];

  for (const r of reportsData) {
    await db.insert(schema.reports).values(r);
  }
  console.log(`   ✓ ${reportsData.length} rapports créés`);

  // ── 8. Messages de chat ────────────────────────────────────────────────────
  console.log('\n💬 Création des messages de chat...');

  const chatData = [
    // Projet 1
    { projectId: proj1.id, senderId: supId,   senderName: 'Jean-François Roy', organizationId: orgId, text: 'Bonjour équipe. Rappel: température de pose max 165°C pour l\'enrobé EB-20. On a eu un rejet la semaine passée à 174°C.', timestamp: daysAgo(30) },
    { projectId: proj1.id, senderId: tech1Id, senderName: 'Kevin Gagnon',       organizationId: orgId, text: 'Compris chef. On a corrigé la centrale. Lot 003B soumis ce matin, conforme.', timestamp: daysAgo(29) },
    { projectId: proj1.id, senderId: tech2Id, senderName: 'Sophie Lavoie',       organizationId: orgId, text: 'Bon travail Kevin. Pour demain, je commence par les joints longitudinaux section 12. On se retrouve à 7h sur le chantier.', timestamp: daysAgo(28) },
    { projectId: proj1.id, senderId: supId,   senderName: 'Jean-François Roy', organizationId: orgId, text: 'Parfait. Marie sera sur place vers 10h pour l\'inspection des carottes.', timestamp: daysAgo(27) },
    // Projet 2
    { projectId: proj2.id, senderId: supId,   senderName: 'Jean-François Roy', organizationId: orgId, text: 'Attention aux températures en cette période. Lot CIM-2025-002 soumis avec température à 7°C. Surveiller la prise 72h.', timestamp: daysAgo(9) },
    { projectId: proj2.id, senderId: tech1Id, senderName: 'Kevin Gagnon',       organizationId: orgId, text: 'Coffrage chauffé à 15°C en permanence. Thermomètre installé. Je vous envoie les relevés chaque 12h.', timestamp: daysAgo(9) },
    // Projet 3
    { projectId: proj3.id, senderId: tech2Id, senderName: 'Sophie Lavoie',       organizationId: orgId, text: 'Démarrage chantier Route 132. Livraison granulat ce matin. Rapport MG-20 soumis.', timestamp: daysAgo(4) },
    { projectId: proj3.id, senderId: supId,   senderName: 'Jean-François Roy', organizationId: orgId, text: 'Reçu Sophie. Je valide demain matin. Assurez-vous d\'avoir les résultats labo pour vendredi.', timestamp: daysAgo(3) },
  ];

  for (const m of chatData) {
    await db.insert(schema.chatMessages).values(m);
  }
  console.log(`   ✓ ${chatData.length} messages créés`);

  // ── 9. Notifications ───────────────────────────────────────────────────────
  console.log('\n🔔 Création des notifications...');

  const allUserIds = [adminId, supId, tech1Id, tech2Id];
  await db.delete(schema.notifications).where(
    // Delete for all demo users — we'll use inArray if available, else loop
    eq(schema.notifications.organizationId, orgId)
  );

  const notifsData = [
    // Admin
    { userId: adminId, organizationId: orgId, type: 'report_update'   as const, message: '⚠️ LOT-ENR-2025-003 rejeté par Jean-François Roy — Température hors norme (174°C).', isRead: false, link: '/reports' },
    { userId: adminId, organizationId: orgId, type: 'system_update'   as const, message: '⚠️ Alerte conformité : le taux de rejet du projet Autoroute 40 atteint 17% (1/6 décidés).', isRead: false, link: '/admin/projects' },
    { userId: adminId, organizationId: orgId, type: 'report_update'   as const, message: '✅ LOT-ENR-2025-003B validé — Colas Québec, Lot corrigé conforme.', isRead: true, link: '/reports' },
    { userId: adminId, organizationId: orgId, type: 'system_update'   as const, message: 'Bienvenue sur SiteWise Reports ! Votre essai PRO de 14 jours a démarré.', isRead: true, link: '/dashboard' },
    // Supervisor
    { userId: supId, organizationId: orgId, type: 'report_update'     as const, message: 'Nouveau rapport soumis par Kevin Gagnon — LOT-ENR-2025-004, Autoroute 40.', isRead: false, link: '/reports' },
    { userId: supId, organizationId: orgId, type: 'report_update'     as const, message: 'Nouveau rapport soumis par Kevin Gagnon — LOT-CIM-2025-002 ⚠️ Anomalie détectée.', isRead: false, link: '/reports' },
    { userId: supId, organizationId: orgId, type: 'project_assignment' as const, message: 'Vous avez été assigné au projet "Route 132 — Reconstruction Longueuil".', isRead: true, link: '/my-projects' },
    // Technician 1
    { userId: tech1Id, organizationId: orgId, type: 'report_update'   as const, message: '❌ LOT-ENR-2025-003 rejeté. Raison : Température de pose hors norme (174°C > 165°C max).', isRead: true, link: '/reports' },
    { userId: tech1Id, organizationId: orgId, type: 'report_update'   as const, message: '✅ LOT-ENR-2025-003B validé. Merci pour la correction.', isRead: true, link: '/reports' },
    { userId: tech1Id, organizationId: orgId, type: 'project_assignment' as const, message: 'Vous avez été assigné au projet "Pont Champlain — Voie de service".', isRead: true, link: '/my-projects' },
    // Technician 2
    { userId: tech2Id, organizationId: orgId, type: 'project_assignment' as const, message: 'Vous avez été assigné au projet "Route 132 — Reconstruction Longueuil".', isRead: false, link: '/my-projects' },
    { userId: tech2Id, organizationId: orgId, type: 'report_update'   as const, message: '✅ LOT-SAB-2025-001 validé. Parfait travail sur la Route 132.', isRead: true, link: '/reports' },
  ];

  await db.insert(schema.notifications).values(notifsData);
  console.log(`   ✓ ${notifsData.length} notifications créées`);

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Seed démo terminé avec succès !\n');
  console.log('🏢 Organisation : Béton Québec Construction Inc.');
  console.log(`   Plan         : PRO (actif)\n`);
  console.log('👤 Comptes démo (mot de passe : Demo1234!)');
  console.log('   ADMIN      demo@sitewise.app');
  console.log('   SUPERVISOR superviseur@sitewise.app');
  console.log('   TECHNICIEN technicien1@sitewise.app');
  console.log('   TECHNICIEN technicien2@sitewise.app\n');
  console.log('📊 Données créées :');
  console.log('   • 5 matériaux');
  console.log('   • 4 projets (3 actifs, 1 terminé)');
  console.log(`   • ${reportsData.length} rapports (VALIDATED / SUBMITTED / REJECTED / DRAFT)`);
  console.log(`   • ${chatData.length} messages de chat`);
  console.log(`   • ${notifsData.length} notifications`);
  console.log('\n🚀 Connectez-vous sur https://site-wise-report.vercel.app/auth/login');
  console.log('═'.repeat(60));

  await pool.end();
}

seedDemo().catch((err) => {
  console.error('\n❌ Erreur seed :', err?.message ?? err);
  process.exit(1);
});
