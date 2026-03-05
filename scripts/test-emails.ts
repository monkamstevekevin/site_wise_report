import { Resend } from 'resend';
import { emailReportSubmitted, emailReportValidated, emailReportRejected } from '../src/lib/email/templates';

const resend = new Resend('re_acU9xWfD_G7AAfK3ZiqeRVdYQxxTpMV71');
const TO = 'delivered@resend.dev';

async function run() {
  // 1 — Rapport soumis (avec anomalie)
  const t1 = emailReportSubmitted({
    reportId: 'a1b2c3d4-0000-0000-0000-000000000001',
    technicianName: 'Jean-François Tremblay',
    projectId: 'prj-autoroute-40',
    materialType: 'asphalt',
    batchNumber: 'BTX-2024-0892',
    supplier: 'Eurovia Québec Inc.',
    isAnomalous: true,
    anomalyExplanation: 'La température de mise en œuvre mesurée (112°C) est inférieure au seuil minimal requis de 135°C pour un enrobé PG 64-22, ce qui risque d\'affecter la compaction et la durabilité de la chaussée.',
  });
  await resend.emails.send({ from: 'SiteWise Reports <onboarding@resend.dev>', to: [TO], ...t1 });
  console.log('✓ Email 1 envoyé — Rapport soumis (anomalie)');

  // 2 — Rapport soumis (conforme)
  const t2 = emailReportSubmitted({
    reportId: 'a1b2c3d4-0000-0000-0000-000000000002',
    technicianName: 'Marie-Ève Bouchard',
    projectId: 'prj-pont-champlain',
    materialType: 'cement',
    batchNumber: 'CIM-2024-0341',
    supplier: 'Holcim Canada',
    isAnomalous: false,
  });
  await resend.emails.send({ from: 'SiteWise Reports <onboarding@resend.dev>', to: [TO], ...t2 });
  console.log('✓ Email 2 envoyé — Rapport soumis (conforme)');

  // 3 — Rapport validé
  const t3 = emailReportValidated({
    reportId: 'a1b2c3d4-0000-0000-0000-000000000002',
    technicianName: 'Marie-Ève Bouchard',
    materialType: 'cement',
    batchNumber: 'CIM-2024-0341',
  });
  await resend.emails.send({ from: 'SiteWise Reports <onboarding@resend.dev>', to: [TO], ...t3 });
  console.log('✓ Email 3 envoyé — Rapport validé');

  // 4 — Rapport rejeté
  const t4 = emailReportRejected({
    reportId: 'a1b2c3d4-0000-0000-0000-000000000001',
    technicianName: 'Jean-François Tremblay',
    materialType: 'asphalt',
    batchNumber: 'BTX-2024-0892',
    rejectionReason: 'La température de mise en œuvre (112°C) est sous le seuil minimal requis par les normes MTQ pour un enrobé PG 64-22 (min. 135°C). Veuillez effectuer un nouvel essai lors de la prochaine livraison et corriger la valeur.',
  });
  await resend.emails.send({ from: 'SiteWise Reports <onboarding@resend.dev>', to: [TO], ...t4 });
  console.log('✓ Email 4 envoyé — Rapport rejeté');

  console.log('\n→ Consulte https://resend.com/emails pour prévisualiser les 4 emails');
}

run().catch(console.error);
