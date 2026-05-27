// ============================================================
// MAILER - Envoi d'emails via SMTP Gmail
// Variables requises dans .env :
//   SMTP_USER=votre.adresse@gmail.com
//   SMTP_PASS=mot_de_passe_application_google (pas le mdp normal)
// ============================================================

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

const envoyerCredentialsUtilisateur = async ({ nom, email, login, mot_de_passe, nom_maquis }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return // SMTP non configuré, on ignore silencieusement

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#6366f1;padding:24px 28px">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">FLOWIX</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Gestion commerciale</p>
      </div>
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Bienvenue, ${nom} 👋</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px">
          Votre compte a été créé sur <strong>${nom_maquis || 'Flowix'}</strong>. Voici vos identifiants de connexion :
        </p>
        <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:13px;color:#374151"><span style="font-weight:700">Login :</span> <span style="font-family:monospace;background:#e0e7ff;padding:2px 8px;border-radius:4px">${login}</span></p>
          <p style="margin:0;font-size:13px;color:#374151"><span style="font-weight:700">Mot de passe :</span> <span style="font-family:monospace;background:#e0e7ff;padding:2px 8px;border-radius:4px">${mot_de_passe}</span></p>
        </div>
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">Connectez-vous sur :</p>
        <p style="margin:0 0 20px;font-size:13px;color:#6366f1;font-weight:600">https://maquisflow.com</p>
        <p style="margin:0;font-size:12px;color:#9ca3af">Pensez à changer votre mot de passe après votre première connexion.</p>
      </div>
      <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f1f5f9;font-size:11px;color:#9ca3af;text-align:center">
        Flowix — maquisflow.com
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"Flowix" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Vos identifiants Flowix — ${nom_maquis || 'Bienvenue'}`,
    html
  })
}

const envoyerResetPassword = async ({ nom, email, reset_url }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#6366f1;padding:24px 28px">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">FLOWIX</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Gestion commerciale</p>
      </div>
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">Réinitialisation de mot de passe</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px">
          Bonjour <strong>${nom}</strong>,<br><br>
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans <strong>1 heure</strong>.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="${reset_url}" style="display:inline-block;background:linear-gradient(135deg,#FF6B35,#ff8c5a);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(255,107,53,0.35)">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">Ou copiez ce lien dans votre navigateur :<br><span style="color:#6366f1">${reset_url}</span></p>
      </div>
      <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f1f5f9;font-size:11px;color:#9ca3af;text-align:center">
        Flowix — maquisflow.com
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"Flowix" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe Flowix',
    html
  })
}

module.exports = { envoyerCredentialsUtilisateur, envoyerResetPassword }
