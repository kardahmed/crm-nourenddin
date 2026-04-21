-- ================================================
-- Custom Email Templates for Auth Emails
-- ================================================
-- Supabase uses email templates for password reset, verification, etc.
-- This migration customizes the password reset email with professional branding.
-- Note: Requires setting via Supabase dashboard or programmatically via PostgREST.

-- For now, document the HTML template that should be set in Supabase auth settings:
-- Path: Auth > Email Templates > Password Reset

-- Template HTML (to be set in Supabase dashboard):
/*
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Réinitialiser votre mot de passe</title>
  <style>
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#F6F9FC}
    table{border-spacing:0;border-collapse:collapse}
    td{padding:0}
    img{border:0;outline:none;text-decoration:none}
    .email-body{width:100%;background-color:#F6F9FC}
    .email-container{max-width:600px;margin:0 auto}
    .content-cell{padding:24px;background:#ffffff;border:1px solid #E3E8EF;border-radius:12px}
    .header-cell{text-align:center;padding:32px 20px 16px}
    .footer-cell{text-align:center;padding:20px;color:#8898AA;font-size:11px;line-height:1.5}
    .btn{display:inline-block;background:#0579DA;color:#ffffff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px}
    .warning-box{background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px;margin:16px 0}
    @media only screen and (max-width:620px){
      .email-container{width:100%!important}
      .content-cell{padding:16px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F6F9FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
  <table role="presentation" class="email-body" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:20px 10px">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td class="header-cell">
              <div style="display:inline-block;background:#0579DA;color:#ffffff;width:48px;height:48px;border-radius:12px;line-height:48px;font-size:20px;font-weight:700;text-align:center;margin-bottom:12px">IP</div>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#0579DA">IMMO PRO-X</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-cell">
                    <h2 style="margin:0 0 8px;font-size:18px;color:#1A2B3D">Réinitialiser votre mot de passe</h2>
                    <p style="margin:0 0 20px;color:#5E6C84;font-size:14px;line-height:1.6">
                      Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                    </p>
                    <div class="warning-box">
                      <div style="color:#92400E;font-size:13px;margin-bottom:12px">
                        <strong>Ce lien expire dans 1 heure.</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                      </div>
                    </div>
                    <div style="text-align:center;margin:28px 0">
                      <a href="{{ .ConfirmationURL }}" class="btn">Créer un nouveau mot de passe</a>
                    </div>
                    <div style="background:#F9FAFB;border-left:4px solid #0579DA;padding:16px;margin-top:24px;border-radius:4px">
                      <p style="margin:0;color:#5E6C84;font-size:12px;line-height:1.6">
                        <strong>Ou copiez ce lien dans votre navigateur :</strong><br>
                        <code style="word-break:break-all;color:#0579DA;font-family:monospace;font-size:11px">{{ .ConfirmationURL }}</code>
                      </p>
                    </div>
                    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E3E8EF">
                      <h3 style="font-size:13px;color:#1A2B3D;margin:0 0 12px;font-weight:600">Pour votre sécurité :</h3>
                      <ul style="margin:0;padding-left:20px;color:#5E6C84;font-size:12px;line-height:1.8">
                        <li>Ne partagez jamais ce lien avec quelqu'un d'autre</li>
                        <li>Choisissez un mot de passe fort (min. 8 caractères)</li>
                        <li>Si vous ne reconnaissez pas cette demande, changez votre mot de passe immédiatement</li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer-cell">
              <p style="margin:0 0 4px">IMMO PRO-X — CRM Immobilier</p>
              <p style="margin:0;color:#B0BEC5;font-size:10px">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
*/

-- Implementation instructions:
-- 1. Go to Supabase Dashboard > Authentication > Email Templates
-- 2. Select "Password Reset"
-- 3. Replace the default template with the HTML above
-- 4. Note: {{ .ConfirmationURL }} is the Supabase template variable for the reset link

-- Alternative: Use Supabase API to update email template programmatically
-- POST to: https://<supabase-project>.supabase.co/auth/admin/email-templates/reset
-- (Requires service role key)
