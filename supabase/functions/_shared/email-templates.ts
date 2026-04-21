// ─── Shared Email Templates for IMMO PRO-X ─────────────────────────────────
// Each template returns a complete HTML email string ready for Resend/SMTP.
// Design: responsive, Outlook-safe table layout, IMMO PRO-X branding.

export interface TemplateParams {
  platform_name?: string
  [key: string]: unknown
}

// ─── Base layout wrapper ────────────────────────────────────────────────────

function baseLayout(platformName: string, content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${platformName}</title>
  <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
  <style>
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#F6F9FC}
    table{border-spacing:0;border-collapse:collapse}
    td{padding:0}
    img{border:0;line-height:100%;outline:none;text-decoration:none}
    .email-body{width:100%;background-color:#F6F9FC}
    .email-container{max-width:600px;margin:0 auto}
    .content-cell{padding:24px;background:#ffffff;border:1px solid #E3E8EF;border-radius:12px}
    .header-cell{text-align:center;padding:32px 20px 16px}
    .footer-cell{text-align:center;padding:20px;color:#8898AA;font-size:11px;line-height:1.5}
    .btn{display:inline-block;background:#0579DA;color:#ffffff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px}
    .info-row{padding:8px 0;border-bottom:1px solid #F0F3F7}
    .info-label{color:#8898AA;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
    .info-value{color:#1A2B3D;font-size:14px;font-weight:500}
    .alert-box{background:#FFF5F0;border:1px solid #FFCDB2;border-radius:8px;padding:16px;margin:16px 0}
    .warning-box{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin:16px 0}
    .success-box{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:16px;margin:16px 0}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important}
      .content-cell{padding:16px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F6F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>` : ''}
  <table role="presentation" class="email-body" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:20px 10px">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td class="header-cell">
              <div style="display:inline-block;background:#0579DA;color:#ffffff;width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:700;text-align:center;margin-bottom:12px">IP</div>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#0579DA">${platformName}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:0 0 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-cell">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="footer-cell">
              <p style="margin:0 0 4px">${platformName} — CRM Immobilier</p>
              <p style="margin:0;color:#B0BEC5;font-size:10px">Cet email a ete envoye automatiquement. Merci de ne pas y repondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Info row helper ────────────────────────────────────────────────────────

function infoRow(label: string, value: string): string {
  return `<div class="info-row">
    <div class="info-label">${label}</div>
    <div class="info-value">${value}</div>
  </div>`
}

// ─── Template: Payment Reminder ─────────────────────────────────────────────

export function paymentReminderTemplate(params: TemplateParams & {
  client_name: string
  unit_code: string
  installment_number: number
  amount: number
  due_date: string
  days_until_due: number
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Rappel d'echeance</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      Une echeance arrive a terme dans <strong>${params.days_until_due} jour(s)</strong>.
    </p>
    <div class="warning-box">
      <div style="font-weight:600;color:#92400E;margin-bottom:8px">Echeance #${params.installment_number}</div>
      <div style="font-size:24px;font-weight:700;color:#1A2B3D">${params.amount.toLocaleString('fr-DZ')} DA</div>
    </div>
    ${infoRow('Client', params.client_name)}
    ${infoRow('Unite', params.unit_code)}
    ${infoRow('Date echeance', params.due_date)}
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn">Voir le detail</a>
    </div>`

  return {
    subject: `Rappel: Echeance #${params.installment_number} — ${params.client_name} — ${params.amount} DA`,
    html: baseLayout(platformName, content, `Echeance de ${params.amount} DA due le ${params.due_date}`),
  }
}

// ─── Template: Payment Overdue ──────────────────────────────────────────────

export function paymentOverdueTemplate(params: TemplateParams & {
  client_name: string
  client_phone: string
  unit_code: string
  installment_number: number
  amount: number
  due_date: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Paiement en retard</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      Une echeance est en <strong style="color:#DC2626">retard de paiement</strong>. Veuillez contacter le client.
    </p>
    <div class="alert-box">
      <div style="font-weight:600;color:#9A3412;margin-bottom:8px">Echeance #${params.installment_number} — EN RETARD</div>
      <div style="font-size:24px;font-weight:700;color:#DC2626">${params.amount.toLocaleString('fr-DZ')} DA</div>
    </div>
    ${infoRow('Client', params.client_name)}
    ${infoRow('Telephone', params.client_phone || '—')}
    ${infoRow('Unite', params.unit_code)}
    ${infoRow('Date echeance', params.due_date)}
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn" style="background:#DC2626">Traiter le retard</a>
    </div>`

  return {
    subject: `RETARD: Echeance #${params.installment_number} — ${params.client_name} — ${params.amount} DA`,
    html: baseLayout(platformName, content, `Paiement en retard: ${params.amount} DA de ${params.client_name}`),
  }
}

// ─── Template: Reservation Expiring ─────────────────────────────────────────

export function reservationExpiringTemplate(params: TemplateParams & {
  client_name: string
  unit_code: string
  expires_at: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Reservation bientot expiree</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      Une reservation expire bientot. Assurez-vous que le client a finalise son dossier.
    </p>
    <div class="warning-box">
      <div style="font-weight:600;color:#92400E">Expiration imminente</div>
    </div>
    ${infoRow('Client', params.client_name)}
    ${infoRow('Unite', params.unit_code)}
    ${infoRow('Expire le', params.expires_at)}
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn">Voir la reservation</a>
    </div>`

  return {
    subject: `Reservation expire bientot — ${params.client_name} — ${params.unit_code}`,
    html: baseLayout(platformName, content, `Reservation de ${params.client_name} expire bientot`),
  }
}

// ─── Template: Reservation Expired ──────────────────────────────────────────

export function reservationExpiredTemplate(params: TemplateParams & {
  client_name: string
  unit_code: string
  reservation_id: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Reservation expiree</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      La reservation suivante a expire automatiquement. Le client a ete passe en <strong>relancement</strong>.
    </p>
    <div class="alert-box">
      <div style="font-weight:600;color:#9A3412">Reservation expiree automatiquement</div>
    </div>
    ${infoRow('Client', params.client_name)}
    ${infoRow('Unite liberee', params.unit_code)}
    ${infoRow('Nouveau statut client', 'Relancement')}
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn">Contacter le client</a>
    </div>`

  return {
    subject: `Reservation expiree — ${params.client_name} — ${params.unit_code}`,
    html: baseLayout(platformName, content, `Reservation de ${params.client_name} a expire`),
  }
}

// ─── Template: Client Relaunch ──────────────────────────────────────────────

export function clientRelaunchTemplate(params: TemplateParams & {
  client_name: string
  days_since_contact: number
  pipeline_stage: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Client a relancer</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      Ce client n'a pas ete contacte depuis <strong>${params.days_since_contact} jours</strong>. Pensez a le relancer.
    </p>
    <div class="warning-box">
      <div style="font-weight:600;color:#92400E">${params.days_since_contact} jours sans contact</div>
    </div>
    ${infoRow('Client', params.client_name)}
    ${infoRow('Etape pipeline', params.pipeline_stage)}
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn">Relancer le client</a>
    </div>`

  return {
    subject: `Relance: ${params.client_name} — ${params.days_since_contact}j sans contact`,
    html: baseLayout(platformName, content, `${params.client_name}: ${params.days_since_contact} jours sans contact`),
  }
}

// ─── Template: Password Reset ──────────────────────────────────────────────

export function passwordResetTemplate(params: TemplateParams & {
  reset_link: string
  user_name?: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Reinitialiser votre mot de passe</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      ${params.user_name ? `Bonjour <strong>${params.user_name}</strong>, ` : ''}vous avez demande a reinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.
    </p>
    <div class="warning-box">
      <div style="color:#92400E;font-size:13px;margin-bottom:12px">
        <strong>Ce lien expire dans 1 heure.</strong> Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
      </div>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${params.reset_link}" class="btn" style="background:#0579DA;padding:14px 32px;font-size:15px">Creer un nouveau mot de passe</a>
    </div>
    <div style="background:#F9FAFB;border-left:4px solid #0579DA;padding:16px;margin-top:24px;border-radius:4px">
      <p style="margin:0;color:#5E6C84;font-size:12px;line-height:1.6">
        <strong>Ou copiez ce lien dans votre navigateur :</strong><br>
        <code style="word-break:break-all;color:#0579DA;font-family:monospace;font-size:11px">${params.reset_link}</code>
      </p>
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E3E8EF">
      <h3 style="font-size:13px;color:#1A2B3D;margin:0 0 12px;font-weight:600">Pour votre securite :</h3>
      <ul style="margin:0;padding-left:20px;color:#5E6C84;font-size:12px;line-height:1.8">
        <li>Ne partagez jamais ce lien avec quelqu'un d'autre</li>
        <li>Choisissez un mot de passe fort (min. 8 caracteres)</li>
        <li>Si vous ne reconnaissez pas cette demande, change votre mot de passe immediatement</li>
      </ul>
    </div>`

  return {
    subject: `Reinitialiser votre mot de passe ${platformName}`,
    html: baseLayout(platformName, content, `Reinitialiser votre mot de passe ${platformName}`),
  }
}

// ─── Template: User Invitation ──────────────────────────────────────────────

export function userInvitationTemplate(params: TemplateParams & {
  invite_link: string
  user_name?: string
  role: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const roleLabel = params.role === 'admin' ? 'Administrateur' : params.role === 'reception' ? 'Réception' : 'Agent'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Bienvenue sur ${platformName} !</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      ${params.user_name ? `Bonjour <strong>${params.user_name}</strong>, ` : ''}vous avez ete invite a rejoindre ${platformName} en tant que <strong>${roleLabel}</strong>. Cliquez sur le bouton ci-dessous pour creer votre mot de passe et acceder a votre espace.
    </p>
    <div class="success-box">
      <div style="color:#166534;font-size:13px;margin-bottom:8px">
        <strong>Role :</strong> ${roleLabel}
      </div>
      <div style="color:#15803D;font-size:12px">
        ${params.role === 'reception' ? 'Acces limite a la reception: saisie de leads, accueil des visites et assignation aux agents.' : 'Acces complet a la plateforme CRM.'}
      </div>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${params.invite_link}" class="btn" style="background:#0579DA;padding:14px 32px;font-size:15px">Accepter l'invitation</a>
    </div>
    <div style="background:#F9FAFB;border-left:4px solid #0579DA;padding:16px;margin-top:24px;border-radius:4px">
      <p style="margin:0;color:#5E6C84;font-size:12px;line-height:1.6">
        <strong>Ou copiez ce lien dans votre navigateur :</strong><br>
        <code style="word-break:break-all;color:#0579DA;font-family:monospace;font-size:11px">${params.invite_link}</code>
      </p>
    </div>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E3E8EF">
      <h3 style="font-size:13px;color:#1A2B3D;margin:0 0 12px;font-weight:600">Quelques infos utiles :</h3>
      <ul style="margin:0;padding-left:20px;color:#5E6C84;font-size:12px;line-height:1.8">
        <li>Ce lien est personnel — ne le partagez pas avec quelqu'un d'autre</li>
        <li>Choisissez un mot de passe fort (min. 8 caracteres)</li>
        <li>Une fois connecte, vous pourrez mettre a jour votre profil</li>
        <li>Contactez votre administrateur si vous avez des questions</li>
      </ul>
    </div>`

  return {
    subject: `Invitation ${platformName} — ${roleLabel}`,
    html: baseLayout(platformName, content, `Invitation ${platformName}`),
  }
}

// ─── Template: Welcome ──────────────────────────────────────────────────────

export function welcomeTemplate(params: TemplateParams & {
  user_name: string
  tenant_name: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Bienvenue sur ${platformName} !</h2>
    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
      Bonjour <strong>${params.user_name}</strong>, votre espace <strong>${params.tenant_name}</strong> est pret.
    </p>
    <div class="success-box">
      <div style="font-weight:600;color:#166534">Votre compte est actif</div>
      <p style="margin:8px 0 0;color:#15803D;font-size:13px">Commencez par ajouter vos projets et vos clients.</p>
    </div>
    <div style="margin-top:20px">
      <h3 style="font-size:14px;color:#1A2B3D;margin:0 0 12px">Pour bien demarrer :</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#5E6C84;font-size:13px">1. Configurez votre premier projet immobilier</td></tr>
        <tr><td style="padding:6px 0;color:#5E6C84;font-size:13px">2. Ajoutez vos unites (appartements, locaux...)</td></tr>
        <tr><td style="padding:6px 0;color:#5E6C84;font-size:13px">3. Importez ou creez vos clients</td></tr>
        <tr><td style="padding:6px 0;color:#5E6C84;font-size:13px">4. Suivez votre pipeline de ventes</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin-top:24px">
      <a href="#" class="btn">Acceder a mon espace</a>
    </div>`

  return {
    subject: `Bienvenue sur ${platformName}, ${params.user_name} !`,
    html: baseLayout(platformName, content, `Votre espace ${params.tenant_name} est pret`),
  }
}

// ─── Template: Generic ──────────────────────────────────────────────────────

export function genericTemplate(params: TemplateParams & {
  title: string
  body: string
}): { subject: string; html: string } {
  const platformName = params.platform_name ?? 'IMMO PRO-X'
  const content = `
    <h2 style="margin:0 0 16px;font-size:18px;color:#1A2B3D">${params.title}</h2>
    <div style="color:#5E6C84;font-size:14px;line-height:1.7">
      ${params.body.replace(/\n/g, '<br>')}
    </div>`

  return {
    subject: params.title,
    html: baseLayout(platformName, content),
  }
}

// ─── Template registry ──────────────────────────────────────────────────────

export type TemplateName = 'payment_reminder' | 'payment_overdue' | 'reservation_expiring' | 'reservation_expired' | 'client_relaunch' | 'password_reset' | 'user_invitation' | 'welcome' | 'generic'

// Each template has an extended param shape — renderTemplate() validates at
// the boundary via TemplateParams, so accepting a permissive input here is
// intentional. We still constrain the return shape.
type AnyTemplateFn = (params: TemplateParams & Record<string, unknown>) => { subject: string; html: string }

const templateMap: Record<TemplateName, AnyTemplateFn> = {
  payment_reminder: paymentReminderTemplate,
  payment_overdue: paymentOverdueTemplate,
  reservation_expiring: reservationExpiringTemplate,
  reservation_expired: reservationExpiredTemplate,
  client_relaunch: clientRelaunchTemplate,
  password_reset: passwordResetTemplate,
  user_invitation: userInvitationTemplate,
  welcome: welcomeTemplate,
  generic: genericTemplate,
}

export function renderTemplate(name: TemplateName, params: TemplateParams): { subject: string; html: string } {
  const fn = templateMap[name]
  if (!fn) throw new Error(`Unknown email template: ${name}`)
  return fn(params)
}

// ─── Template metadata (for admin UI) ───────────────────────────────────────

export const TEMPLATE_META: Array<{
  id: TemplateName
  label: string
  description: string
  trigger: string
  sampleData: Record<string, unknown>
}> = [
  {
    id: 'payment_reminder',
    label: 'Rappel d\'echeance',
    description: 'Envoye 3 jours avant la date d\'echeance d\'un paiement.',
    trigger: 'Cron: check-reminders',
    sampleData: { client_name: 'Karim Bouzid', unit_code: 'A-204', installment_number: 3, amount: 850000, due_date: '2026-04-20', days_until_due: 3 },
  },
  {
    id: 'payment_overdue',
    label: 'Paiement en retard',
    description: 'Envoye quand un paiement est marque comme en retard.',
    trigger: 'Cron: check-payments',
    sampleData: { client_name: 'Amina Ferhat', client_phone: '0555 12 34 56', unit_code: 'B-102', installment_number: 5, amount: 1200000, due_date: '2026-04-10' },
  },
  {
    id: 'reservation_expiring',
    label: 'Reservation bientot expiree',
    description: 'Envoye 2 jours avant l\'expiration d\'une reservation.',
    trigger: 'Cron: check-reminders',
    sampleData: { client_name: 'Youcef Mebarki', unit_code: 'C-301', expires_at: '2026-04-18 14:00' },
  },
  {
    id: 'reservation_expired',
    label: 'Reservation expiree',
    description: 'Envoye quand une reservation expire automatiquement.',
    trigger: 'Cron: check-reservations',
    sampleData: { client_name: 'Nadia Khelif', unit_code: 'D-105', reservation_id: 'res-001' },
  },
  {
    id: 'client_relaunch',
    label: 'Client a relancer',
    description: 'Envoye quand un client n\'a pas ete contacte depuis 3+ jours.',
    trigger: 'Cron: check-reminders',
    sampleData: { client_name: 'Mohamed Slimani', days_since_contact: 5, pipeline_stage: 'negociation' },
  },
  {
    id: 'welcome',
    label: 'Bienvenue',
    description: 'Email de bienvenue pour les nouveaux utilisateurs.',
    trigger: 'Manuel / Onboarding',
    sampleData: { user_name: 'Ahmed Benali', tenant_name: 'Agence Sahel Immobilier' },
  },
  {
    id: 'generic',
    label: 'Email generique',
    description: 'Template generique pour envois manuels.',
    trigger: 'Manuel',
    sampleData: { title: 'Information importante', body: 'Ceci est un email generique envoye depuis la plateforme IMMO PRO-X.\n\nMerci de votre attention.' },
  },
]
