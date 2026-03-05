import { APP_URL } from './client';

const MATERIAL_LABELS: Record<string, string> = {
  cement: 'Ciment Portland',
  asphalt: 'Enrobé bitumineux',
  gravel: 'Granulats (gravier)',
  sand: 'Sable',
  other: 'Autre matériau',
};

const STATUS_COLORS: Record<string, string> = {
  VALIDATED: '#059669',
  REJECTED:  '#dc2626',
  SUBMITTED: '#d97706',
};

// ─── Base layout ─────────────────────────────────────────────────────────────

const wrap = (content: string, preheader = '') => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SiteWise Reports</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Header -->
        <tr><td style="background:#2563eb;border-radius:10px 10px 0 0;padding:24px 32px;">
          <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SiteWise</span>
          <span style="font-size:13px;color:#93c5fd;margin-left:8px;">Rapports de terrain</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            SiteWise Reports — Québec, Canada<br/>
            Ce courriel a été envoyé automatiquement. Ne pas répondre à ce message.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (href: string, label: string, color = '#2563eb') =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:20px;">${label}</a>`;

const field = (label: string, value: string) =>
  `<tr>
    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${value}</td>
  </tr>`;

// ─── Template 1 : Rapport soumis (→ superviseurs/admins) ─────────────────────

interface SubmittedParams {
  reportId: string;
  technicianName: string;
  projectId: string;
  materialType: string;
  batchNumber: string;
  supplier: string;
  isAnomalous?: boolean;
  anomalyExplanation?: string;
}

export function emailReportSubmitted(p: SubmittedParams) {
  const url = `${APP_URL}/reports/view/${p.reportId}`;
  const mat = MATERIAL_LABELS[p.materialType] ?? p.materialType;
  const anomalyBanner = p.isAnomalous
    ? `<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:14px 16px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#c2410c;">⚠️ Anomalie détectée par l'IA</p>
        <p style="margin:0;font-size:12px;color:#9a3412;">${p.anomalyExplanation ?? 'Vérification recommandée avant validation.'}</p>
       </div>`
    : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 16px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#15803d;">✓ Aucune anomalie détectée par l'IA</p>
       </div>`;

  const content = `
    <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Nouveau rapport soumis</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Un rapport de terrain est en attente de votre validation.</p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;width:100%;box-sizing:border-box;background:#f9fafb;">
      ${field('Technicien', p.technicianName)}
      ${field('Matériau', mat)}
      ${field('No de lot', p.batchNumber)}
      ${field('Fournisseur', p.supplier)}
      ${field('Projet', p.projectId.slice(0, 8).toUpperCase())}
      ${field('No de rapport', p.reportId.slice(0, 8).toUpperCase())}
    </table>

    ${anomalyBanner}

    ${btn(url, 'Voir et valider le rapport')}`;

  return {
    subject: `📋 Nouveau rapport — ${mat} · Lot ${p.batchNumber}${p.isAnomalous ? ' ⚠️ Anomalie' : ''}`,
    html: wrap(content, `${p.technicianName} a soumis un rapport de ${mat}`),
  };
}

// ─── Template 2 : Rapport validé (→ technicien) ──────────────────────────────

interface ValidatedParams {
  reportId: string;
  technicianName: string;
  materialType: string;
  batchNumber: string;
}

export function emailReportValidated(p: ValidatedParams) {
  const url = `${APP_URL}/reports/view/${p.reportId}`;
  const mat = MATERIAL_LABELS[p.materialType] ?? p.materialType;

  const content = `
    <div style="text-align:center;padding:16px 0 28px;">
      <div style="display:inline-block;background:#f0fdf4;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;margin-bottom:12px;">✓</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#059669;">Rapport validé !</h2>
      <p style="margin:0;font-size:15px;color:#6b7280;">Bonjour ${p.technicianName}, votre rapport a été approuvé.</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #dcfce7;border-radius:8px;padding:16px;width:100%;box-sizing:border-box;background:#f0fdf4;">
      ${field('Matériau', mat)}
      ${field('No de lot', p.batchNumber)}
      ${field('No de rapport', p.reportId.slice(0, 8).toUpperCase())}
      ${field('Statut', '✓ Validé')}
    </table>

    ${btn(url, 'Voir le rapport', STATUS_COLORS.VALIDATED)}`;

  return {
    subject: `✅ Rapport validé — ${mat} · Lot ${p.batchNumber}`,
    html: wrap(content, `Votre rapport de ${mat} a été approuvé`),
  };
}

// ─── Template 3 : Rapport rejeté (→ technicien) ──────────────────────────────

interface RejectedParams {
  reportId: string;
  technicianName: string;
  materialType: string;
  batchNumber: string;
  rejectionReason: string;
}

export function emailReportRejected(p: RejectedParams) {
  const url = `${APP_URL}/reports/edit/${p.reportId}`;
  const mat = MATERIAL_LABELS[p.materialType] ?? p.materialType;

  const content = `
    <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#dc2626;">Rapport rejeté — Action requise</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Bonjour ${p.technicianName}, votre rapport a été rejeté. Veuillez le corriger et le resoumettre.</p>

    <table cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;width:100%;box-sizing:border-box;background:#f9fafb;">
      ${field('Matériau', mat)}
      ${field('No de lot', p.batchNumber)}
      ${field('No de rapport', p.reportId.slice(0, 8).toUpperCase())}
    </table>

    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Raison du rejet</p>
      <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.5;">${p.rejectionReason}</p>
    </div>

    ${btn(url, 'Corriger et resoumettre', STATUS_COLORS.REJECTED)}`;

  return {
    subject: `❌ Rapport rejeté — Correction requise · Lot ${p.batchNumber}`,
    html: wrap(content, `Votre rapport de ${mat} a été rejeté — correction requise`),
  };
}

// ─── Trial expiring ───────────────────────────────────────────────────────────

export function emailTrialExpiring(p: {
  organizationName: string;
  daysLeft: number;
  billingUrl: string;
}) {
  const urgency = p.daysLeft <= 1 ? '#dc2626' : '#d97706';
  const daysLabel = p.daysLeft === 0
    ? "expire aujourd'hui"
    : p.daysLeft === 1
    ? 'expire demain'
    : `expire dans ${p.daysLeft} jours`;

  const content = `
    <div style="text-align:center;padding:16px 0 24px;">
      <div style="display:inline-block;background:#fff7ed;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;margin-bottom:12px;">⏳</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${urgency};">Votre essai ${daysLabel}</h2>
      <p style="margin:0;font-size:15px;color:#6b7280;">Organisation : <strong>${p.organizationName}</strong></p>
    </div>

    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:16px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
        Après expiration de l'essai, l'accès à la création de rapports sera suspendu.
        Passez à un plan payant pour continuer sans interruption.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      ${field('Plan Starter', '49 $/mois — jusqu\'à 5 utilisateurs')}
      ${field('Plan Pro', '149 $/mois — utilisateurs illimités')}
    </table>

    ${btn(p.billingUrl, 'Choisir un plan', '#2563eb')}`;

  return {
    subject: `⏳ Votre essai SiteWise ${daysLabel} — Passez à un plan payant`,
    html: wrap(content, `Votre essai gratuit de ${p.organizationName} ${daysLabel}`),
  };
}

// ─── Invitation ───────────────────────────────────────────────────────────────

export function emailInvitation(p: {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
}) {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
      Vous avez été invité(e) à rejoindre ${p.organizationName}
    </h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      <strong>${p.inviterName}</strong> vous invite à rejoindre l'organisation <strong>${p.organizationName}</strong> sur SiteWise Reports.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      Cliquez sur le bouton ci-dessous pour créer votre compte. Ce lien est valable 7 jours.
    </p>
    ${btn(p.inviteUrl, 'Rejoindre l\'organisation', '#2563eb')}`;

  return {
    subject: `Invitation à rejoindre ${p.organizationName} sur SiteWise Reports`,
    html: wrap(content, `${p.inviterName} vous invite à rejoindre ${p.organizationName}`),
  };
}
