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

// ============================================================
// ABONNEMENT — Emails établissement + super admin
// ============================================================

const _headerMail = `
  <div style="background:#6366f1;padding:24px 28px">
    <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px">FLOWIX</h1>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Gestion commerciale</p>
  </div>`

const _footerMail = `
  <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f1f5f9;font-size:11px;color:#9ca3af;text-align:center">
    Flowix — maquisflow.com
  </div>`

// Email aux gérants/patrons : abonnement activé / renouvelé
const envoyerAbonnementActif = async ({ nom, email, nom_maquis, date_echeance, type_acces }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  const dateStr = date_echeance ? new Date(date_echeance).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${_headerMail}
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">✅ Abonnement activé — ${nom_maquis}</h2>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Bonjour <strong>${nom}</strong>,</p>
        <p style="margin:0 0 20px;color:#374151;font-size:14px">
          Votre abonnement Flowix pour <strong>${nom_maquis}</strong> est ${type_acces === 'achat_unique' ? '<strong>actif à vie</strong> (accès permanent)' : `actif jusqu'au <strong style="color:#16a34a">${dateStr}</strong>`}.
        </p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:8px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;font-size:13px;color:#15803d">
            ${type_acces === 'achat_unique' ? '🔓 Accès permanent — aucune échéance.' : `📅 Prochaine échéance : <strong>${dateStr}</strong>`}
          </p>
        </div>
        <p style="margin:0;font-size:13px;color:#9ca3af">Accédez à votre espace sur <a href="https://maquisflow.com" style="color:#6366f1">maquisflow.com</a>.</p>
      </div>
      ${_footerMail}
    </div>`
  await transporter.sendMail({ from: `"Flowix" <${process.env.SMTP_USER}>`, to: email, subject: `✅ Abonnement Flowix activé — ${nom_maquis}`, html })
}

// Email aux gérants/patrons : rappel J-7 ou J-3
const envoyerRappelEcheance = async ({ nom, email, nom_maquis, date_echeance, jours_restants }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  const dateStr = new Date(date_echeance).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
  const urgence = jours_restants <= 3
  const couleur = urgence ? '#dc2626' : '#d97706'
  const bg      = urgence ? '#fef2f2' : '#fffbeb'
  const border  = urgence ? '#fecaca' : '#fde68a'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${_headerMail}
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${urgence ? '🚨' : '⚠️'} Abonnement expire bientôt — ${nom_maquis}</h2>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Bonjour <strong>${nom}</strong>,</p>
        <div style="background:${bg};border-left:4px solid ${couleur};border-radius:8px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;font-size:14px;color:${couleur};font-weight:700">
            ${urgence ? `🚨 Plus que ${jours_restants} jour${jours_restants > 1 ? 's' : ''} !` : `⚠️ ${jours_restants} jours restants`}
          </p>
          <p style="margin:6px 0 0;font-size:13px;color:#374151">
            Votre abonnement Flowix pour <strong>${nom_maquis}</strong> expire le <strong>${dateStr}</strong>.
          </p>
        </div>
        <p style="margin:0 0 16px;color:#374151;font-size:14px">
          Renouvelez votre abonnement pour continuer à utiliser Flowix sans interruption. Contactez-nous à <a href="mailto:${process.env.SMTP_USER}" style="color:#6366f1">${process.env.SMTP_USER}</a>.
        </p>
        <p style="margin:0;font-size:13px;color:#9ca3af">Accédez à votre espace : <a href="https://maquisflow.com" style="color:#6366f1">maquisflow.com</a></p>
      </div>
      ${_footerMail}
    </div>`
  await transporter.sendMail({ from: `"Flowix" <${process.env.SMTP_USER}>`, to: email, subject: `${urgence ? '🚨' : '⚠️'} Abonnement Flowix — ${jours_restants}j restants — ${nom_maquis}`, html })
}

// Email aux gérants/patrons : abonnement expiré
const envoyerAbonnementExpire = async ({ nom, email, nom_maquis }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${_headerMail}
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">❌ Abonnement expiré — ${nom_maquis}</h2>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Bonjour <strong>${nom}</strong>,</p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:14px 18px;margin-bottom:20px">
          <p style="margin:0;font-size:14px;color:#dc2626;font-weight:700">Votre abonnement Flowix a expiré.</p>
          <p style="margin:6px 0 0;font-size:13px;color:#374151">L'accès à votre espace <strong>${nom_maquis}</strong> est suspendu.</p>
        </div>
        <p style="margin:0 0 16px;color:#374151;font-size:14px">
          Pour réactiver votre accès, contactez-nous à <a href="mailto:${process.env.SMTP_USER}" style="color:#6366f1">${process.env.SMTP_USER}</a> ou WhatsApp.
        </p>
      </div>
      ${_footerMail}
    </div>`
  await transporter.sendMail({ from: `"Flowix" <${process.env.SMTP_USER}>`, to: email, subject: `❌ Abonnement Flowix expiré — ${nom_maquis}`, html })
}

// Email au super admin : alerte échéance
const envoyerAlerteSuperAdmin = async ({ nom_maquis, maquis_id, type_alerte, date_echeance, jours_restants, users }) => {
  const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !ADMIN_EMAIL) return
  const dateStr = date_echeance ? new Date(date_echeance).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const usersStr = (users || []).map(u => `${u.nom} (${u.email}) — ${u.role}`).join('<br>')
  const titres = {
    expire:  `❌ Abonnement EXPIRÉ — ${nom_maquis}`,
    j7:      `⚠️ Abonnement expire dans 7j — ${nom_maquis}`,
    j3:      `🚨 Abonnement expire dans 3j — ${nom_maquis}`,
    active:  `✅ Abonnement activé — ${nom_maquis}`
  }
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      ${_headerMail}
      <div style="padding:28px">
        <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${titres[type_alerte] || 'Alerte abonnement'}</h2>
        <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;padding:14px 18px;margin-bottom:16px;font-size:13px;color:#374151">
          <p style="margin:0 0 6px"><strong>Établissement :</strong> ${nom_maquis} (ID: ${maquis_id})</p>
          <p style="margin:0 0 6px"><strong>Échéance :</strong> ${dateStr}</p>
          ${jours_restants !== undefined ? `<p style="margin:0 0 6px"><strong>Jours restants :</strong> ${jours_restants}</p>` : ''}
          <p style="margin:0"><strong>Contacts :</strong><br>${usersStr || 'Aucun gérant/patron trouvé'}</p>
        </div>
        <p style="margin:0;font-size:12px;color:#9ca3af">Gérez les abonnements sur <a href="https://maquisflow.com/admin/dashboard" style="color:#6366f1">maquisflow.com/admin/dashboard</a></p>
      </div>
      ${_footerMail}
    </div>`
  await transporter.sendMail({ from: `"Flowix Alertes" <${process.env.SMTP_USER}>`, to: ADMIN_EMAIL, subject: titres[type_alerte] || 'Alerte abonnement Flowix', html })
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

module.exports = {
  envoyerCredentialsUtilisateur,
  envoyerResetPassword,
  envoyerAbonnementActif,
  envoyerRappelEcheance,
  envoyerAbonnementExpire,
  envoyerAlerteSuperAdmin
}
