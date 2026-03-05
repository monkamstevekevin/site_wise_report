/**
 * Script de seed — données de démonstration pour SiteWise Reports
 * Usage: npx tsx scripts/seed.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Démarrage du seed...\n');

  // 1. Récupérer le premier utilisateur existant (l'admin)
  const existingUsers = await db.select().from(schema.users).limit(5);
  if (existingUsers.length === 0) {
    console.error('❌ Aucun utilisateur trouvé. Crée d\'abord un compte sur l\'app puis relance ce script.');
    process.exit(1);
  }
  const adminUser = existingUsers[0];
  console.log(`✅ Utilisateur trouvé : ${adminUser.name} (${adminUser.email}) — sera utilisé comme technicien/admin\n`);

  // 2. Matériaux
  console.log('📦 Insertion des matériaux...');
  const materialsData = [
    { name: 'Ciment Portland CEM I', type: 'cement' as const, minDensity: '1400', maxDensity: '1600', minTemperature: '5', maxTemperature: '35' },
    { name: 'Asphalte Bitumineux BB 0/10', type: 'asphalt' as const, minDensity: '2200', maxDensity: '2500', minTemperature: '130', maxTemperature: '165' },
    { name: 'Gravier Concassé 20/40', type: 'gravel' as const, minDensity: '1550', maxDensity: '1750', minTemperature: '5', maxTemperature: '45' },
    { name: 'Sable de Rivière 0/4', type: 'sand' as const, minDensity: '1500', maxDensity: '1700', minTemperature: '5', maxTemperature: '40' },
    { name: 'Béton Prêt à l\'Emploi C25/30', type: 'other' as const, minDensity: '2300', maxDensity: '2450', minTemperature: '5', maxTemperature: '30' },
  ];
  const insertedMaterials = await db.insert(schema.materials).values(materialsData).returning();
  const materialIds: Record<string, string> = {};
  insertedMaterials.forEach(m => { materialIds[m.type] = m.id; });
  console.log(`   ✓ ${insertedMaterials.length} matériaux créés`);

  // 3. Projets — on crée toujours les 4 projets de démo
  console.log('\n🏗️  Insertion des projets...');
  const projectsData = [
    {
      name: 'Autoroute A3 — Élargissement Nord',
      location: 'Lyon, Auvergne-Rhône-Alpes',
      description: 'Élargissement de 12 km de l\'autoroute A3 avec ajout de 2 voies supplémentaires et réfection complète de la chaussée.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(45),
      endDate: daysFromNow(120),
    },
    {
      name: 'Pont Gustave — Réhabilitation',
      location: 'Marseille, Provence-Alpes-Côte d\'Azur',
      description: 'Réhabilitation structurelle du pont Gustave : renforcement des piliers, remplacement du tablier et mise aux normes sismiques.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(20),
      endDate: daysFromNow(200),
    },
    {
      name: 'ZAC Les Chartrons — Voirie',
      location: 'Bordeaux, Nouvelle-Aquitaine',
      description: 'Création de la voirie interne de la zone d\'aménagement concerté : 8 km de routes, réseaux enterrés et espaces verts.',
      status: 'ACTIVE' as const,
      startDate: daysAgo(10),
      endDate: daysFromNow(90),
    },
    {
      name: 'RN 7 — Déviation Sud Moulins',
      location: 'Moulins, Allier',
      description: 'Construction d\'une déviation de 6,5 km pour désengorger le centre-ville de Moulins.',
      status: 'COMPLETED' as const,
      startDate: daysAgo(180),
      endDate: daysAgo(15),
    },
  ];
  const insertedProjects = await db.insert(schema.projects).values(projectsData).returning();
  const projectIds = insertedProjects.map(p => p.id);
  console.log(`   ✓ ${insertedProjects.length} projets créés`);

  // 4. Assigner matériaux aux projets
  console.log('\n🔗 Assignation des matériaux aux projets...');
  const matIds = Object.values(materialIds);
  for (const projectId of projectIds) {
    for (const materialId of matIds) {
      try {
        await db.insert(schema.projectMaterials).values({ projectId, materialId }).onConflictDoNothing();
      } catch {}
    }
  }
  console.log('   ✓ Matériaux assignés aux projets');

  // 5. Assigner l'utilisateur aux projets actifs
  console.log('\n👷 Assignation de l\'utilisateur aux projets...');
  for (const projectId of projectIds.slice(0, 3)) {
    try {
      await db.insert(schema.userAssignments).values({
        userId: adminUser.id,
        projectId,
        assignmentType: 'FULL_TIME',
      }).onConflictDoNothing();
    } catch {}
  }
  console.log('   ✓ Utilisateur assigné aux 3 projets actifs');

  // 6. Rapports
  console.log('\n📋 Insertion des rapports...');
  {
    const reportsData = [
      // Projet 1 — A3
      { projectId: projectIds[0], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '148.5', volume: '45.2', density: '2340.0', humidity: '0.8', batchNumber: 'LOT-ASP-2024-001', supplier: 'Eurovia Matériaux', samplingMethod: 'grab' as const, status: 'VALIDATED' as const, notes: 'Température de pose conforme. Compactage optimal atteint après 9 passes.', aiIsAnomalous: false, aiAnomalyExplanation: 'Toutes les mesures sont dans les plages de tolérance définies.', createdAt: new Date(daysAgo(40)), updatedAt: new Date(daysAgo(38)) },
      { projectId: projectIds[0], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '155.0', volume: '38.7', density: '2290.0', humidity: '0.5', batchNumber: 'LOT-ASP-2024-002', supplier: 'Eurovia Matériaux', samplingMethod: 'composite' as const, status: 'VALIDATED' as const, notes: 'Bon comportement à la mise en œuvre.', aiIsAnomalous: false, aiAnomalyExplanation: 'Mesures conformes.', createdAt: new Date(daysAgo(35)), updatedAt: new Date(daysAgo(33)) },
      { projectId: projectIds[0], technicianId: adminUser.id, materialType: 'gravel' as const, temperature: '18.0', volume: '120.0', density: '1620.0', humidity: '3.2', batchNumber: 'LOT-GRV-2024-001', supplier: 'Carrières du Rhône', samplingMethod: 'grab' as const, status: 'VALIDATED' as const, notes: 'Granulométrie conforme aux spécifications du marché.', aiIsAnomalous: false, aiAnomalyExplanation: 'Valeurs normales.', createdAt: new Date(daysAgo(30)), updatedAt: new Date(daysAgo(28)) },
      { projectId: projectIds[0], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '172.0', volume: '42.1', density: '2180.0', humidity: '0.3', batchNumber: 'LOT-ASP-2024-003', supplier: 'Colas Sud-Ouest', samplingMethod: 'grab' as const, status: 'REJECTED' as const, rejectionReason: 'Température de pose trop élevée (172°C > 165°C max). Risque de vieillissement accéléré du bitume. Corriger la température de centrale et resoumettre.', aiIsAnomalous: true, aiAnomalyExplanation: 'ANOMALIE : Température hors plage acceptable. La température mesurée de 172°C dépasse le seuil maximal de 165°C pour cet asphalte, ce qui peut entraîner une dégradation des propriétés liantes.', createdAt: new Date(daysAgo(25)), updatedAt: new Date(daysAgo(23)) },
      { projectId: projectIds[0], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '151.0', volume: '44.8', density: '2320.0', humidity: '0.6', batchNumber: 'LOT-ASP-2024-003B', supplier: 'Colas Sud-Ouest', samplingMethod: 'grab' as const, status: 'SUBMITTED' as const, notes: 'Lot corrigé après rejet. Température centrale ajustée à 151°C.', aiIsAnomalous: false, aiAnomalyExplanation: 'Température revenue dans la plage acceptable.', createdAt: new Date(daysAgo(22)), updatedAt: new Date(daysAgo(20)) },

      // Projet 2 — Pont Gustave
      { projectId: projectIds[1], technicianId: adminUser.id, materialType: 'cement' as const, temperature: '22.0', volume: '28.5', density: '1480.0', humidity: '6.5', batchNumber: 'LOT-CIM-2024-001', supplier: 'Lafarge Holcim', samplingMethod: 'composite' as const, status: 'VALIDATED' as const, notes: 'Résistance à 28 jours conforme R28 = 38 MPa.', aiIsAnomalous: false, aiAnomalyExplanation: 'Paramètres dans les normes.', createdAt: new Date(daysAgo(18)), updatedAt: new Date(daysAgo(16)) },
      { projectId: projectIds[1], technicianId: adminUser.id, materialType: 'other' as const, temperature: '20.0', volume: '15.0', density: '2380.0', humidity: '4.2', batchNumber: 'LOT-BET-2024-001', supplier: 'Bétonord SA', samplingMethod: 'grab' as const, status: 'SUBMITTED' as const, notes: 'Affaissement mesuré à 95mm. Dans la plage requise 75-125mm.', aiIsAnomalous: false, aiAnomalyExplanation: 'Consistance du béton conforme.', createdAt: new Date(daysAgo(15)), updatedAt: new Date(daysAgo(14)) },
      { projectId: projectIds[1], technicianId: adminUser.id, materialType: 'cement' as const, temperature: '8.0', volume: '32.0', density: '1390.0', humidity: '7.8', batchNumber: 'LOT-CIM-2024-002', supplier: 'Lafarge Holcim', samplingMethod: 'composite' as const, status: 'SUBMITTED' as const, notes: 'Température ambiante basse. Chauffage du coffrage prévu pendant 48h.', aiIsAnomalous: true, aiAnomalyExplanation: 'ATTENTION : Température proche du seuil minimal (8°C vs 5°C min). Risque de ralentissement de la prise. Surveillance renforcée recommandée.', createdAt: new Date(daysAgo(8)), updatedAt: new Date(daysAgo(8)) },

      // Projet 3 — ZAC Chartrons
      { projectId: projectIds[2], technicianId: adminUser.id, materialType: 'sand' as const, temperature: '19.5', volume: '85.0', density: '1610.0', humidity: '5.1', batchNumber: 'LOT-SAB-2024-001', supplier: 'Sablières de Gironde', samplingMethod: 'grab' as const, status: 'VALIDATED' as const, notes: 'Équivalent de sable ES = 82. Conforme.', aiIsAnomalous: false, aiAnomalyExplanation: 'Granulométrie et humidité dans les normes.', createdAt: new Date(daysAgo(9)), updatedAt: new Date(daysAgo(7)) },
      { projectId: projectIds[2], technicianId: adminUser.id, materialType: 'gravel' as const, temperature: '21.0', volume: '95.0', density: '1680.0', humidity: '2.8', batchNumber: 'LOT-GRV-2024-002', supplier: 'Carrières du Rhône', samplingMethod: 'composite' as const, status: 'DRAFT' as const, notes: 'Prélèvement en cours. Analyses en attente.', createdAt: new Date(daysAgo(3)), updatedAt: new Date(daysAgo(3)) },
      { projectId: projectIds[2], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '145.0', volume: '52.3', density: '2310.0', humidity: '0.4', batchNumber: 'LOT-ASP-2024-004', supplier: 'Eurovia Matériaux', samplingMethod: 'grab' as const, status: 'DRAFT' as const, notes: 'Première couche de base. Vérification compactage à prévoir demain.', createdAt: new Date(daysAgo(1)), updatedAt: new Date(daysAgo(1)) },

      // Projet 4 — RN7 (terminé)
      { projectId: projectIds[3], technicianId: adminUser.id, materialType: 'asphalt' as const, temperature: '152.0', volume: '68.0', density: '2350.0', humidity: '0.7', batchNumber: 'LOT-ASP-2023-020', supplier: 'Colas Sud-Ouest', samplingMethod: 'grab' as const, status: 'VALIDATED' as const, notes: 'Dernier lot du chantier. Qualité excellente.', aiIsAnomalous: false, aiAnomalyExplanation: 'Paramètres optimaux.', createdAt: new Date(daysAgo(20)), updatedAt: new Date(daysAgo(18)) },
      { projectId: projectIds[3], technicianId: adminUser.id, materialType: 'gravel' as const, temperature: '17.0', volume: '200.0', density: '1700.0', humidity: '2.1', batchNumber: 'LOT-GRV-2023-015', supplier: 'Carrières du Rhône', samplingMethod: 'core' as const, status: 'VALIDATED' as const, notes: 'Couche de fondation conforme.', aiIsAnomalous: false, aiAnomalyExplanation: 'Valeurs normales.', createdAt: new Date(daysAgo(25)), updatedAt: new Date(daysAgo(23)) },
    ];

    // Drizzle ne supporte pas les timestamps directs dans insert facilement — on fait via raw
    for (const r of reportsData) {
      const { createdAt, updatedAt, ...rest } = r;
      await db.insert(schema.reports).values({
        ...rest,
        createdAt: createdAt,
        updatedAt: updatedAt,
      });
    }
    console.log(`   ✓ ${reportsData.length} rapports créés`);
  }

  // 7. Notifications
  console.log('\n🔔 Insertion des notifications...');
  const existingNotifs = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, adminUser.id)).limit(1);

  if (existingNotifs.length === 0) {
    await db.insert(schema.notifications).values([
      { userId: adminUser.id, type: 'report_update', message: 'Le rapport LOT-ASP-2024-003 a été rejeté. Veuillez corriger la température de pose.', isRead: false, link: '/reports' },
      { userId: adminUser.id, type: 'project_assignment', message: 'Vous avez été assigné au projet "Pont Gustave — Réhabilitation".', isRead: true, link: '/my-projects' },
      { userId: adminUser.id, type: 'report_update', message: 'Le rapport LOT-CIM-2024-001 a été validé par le superviseur.', isRead: true, link: '/reports' },
      { userId: adminUser.id, type: 'system_update', message: 'Bienvenue sur SiteWise Reports ! Consultez le tableau de bord pour commencer.', isRead: true, link: '/dashboard' },
    ]);
    console.log('   ✓ 4 notifications créées');
  } else {
    console.log('   ✓ Notifications existantes, skip.');
  }

  console.log('\n✅ Seed terminé avec succès !');
  console.log('\n📊 Résumé des données de démo :');
  console.log('   • 5 matériaux (ciment, asphalte, gravier, sable, béton)');
  console.log('   • 4 projets (3 actifs, 1 terminé)');
  console.log('   • 13 rapports (VALIDATED, SUBMITTED, REJECTED, DRAFT)');
  console.log('   • 4 notifications');
  console.log('\n🚀 Rafraîchis l\'app sur http://localhost:3001');

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Erreur lors du seed :', err);
  process.exit(1);
});
