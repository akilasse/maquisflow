// ============================================================
// CRON ABONNEMENTS — Vérification quotidienne à 8h00
// - J-7 : rappel aux gérants/patrons + alerte super admin
// - J-3 : rappel urgent aux gérants/patrons + alerte super admin
// - J=0 : notification expiration + marquer 'expire' + alerte super admin
// ============================================================

const cron = require('node-cron')
const {
  envoyerRappelEcheance,
  envoyerAbonnementExpire,
  envoyerAlerteSuperAdmin
} = require('../utils/mailer')

// Retourne les gérants et patrons actifs d'un maquis avec leurs emails
const getContactsMaquis = async (prisma, maquis_id) => {
  const liaisons = await prisma.utilisateurMaquis.findMany({
    where: { maquis_id, actif: true, role: { in: ['gerant', 'patron'] } },
    include: { utilisateur: { select: { nom: true, email: true } } }
  })
  return liaisons.map(l => ({ nom: l.utilisateur.nom, email: l.utilisateur.email, role: l.role }))
}

const lancerCronAbonnements = (prisma) => {

  // Tous les jours à 8h00
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Vérification abonnements —', new Date().toISOString())

    try {
      const maintenant = new Date()

      // Tous les abonnements actifs avec échéance (type abonnement)
      const abonnements = await prisma.abonnement.findMany({
        where: {
          statut: 'actif',
          type_acces: 'abonnement',
          date_echeance: { not: null }
        },
        include: { maquis: { select: { id: true, nom: true } } }
      })

      for (const abo of abonnements) {
        const echeance   = new Date(abo.date_echeance)
        const diffMs     = echeance - maintenant
        const joursRestants = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const users      = await getContactsMaquis(prisma, abo.maquis_id)
        const nom_maquis = abo.maquis?.nom || `Établissement #${abo.maquis_id}`

        // ─── EXPIRÉ ────────────────────────────────────────────
        if (joursRestants < 0) {
          // Mettre à jour le statut
          await prisma.abonnement.update({
            where: { maquis_id: abo.maquis_id },
            data: { statut: 'expire', bloque: true, updated_at: new Date() }
          })
          // Notifier chaque gérant/patron
          for (const u of users) {
            envoyerAbonnementExpire({ nom: u.nom, email: u.email, nom_maquis }).catch(() => {})
          }
          // Alerter le super admin
          envoyerAlerteSuperAdmin({
            nom_maquis, maquis_id: abo.maquis_id,
            type_alerte: 'expire',
            date_echeance: abo.date_echeance,
            jours_restants: joursRestants,
            users
          }).catch(() => {})
          console.log(`[CRON] Abonnement expiré → ${nom_maquis} (ID: ${abo.maquis_id})`)

        // ─── J-3 ───────────────────────────────────────────────
        } else if (joursRestants === 3) {
          for (const u of users) {
            envoyerRappelEcheance({ nom: u.nom, email: u.email, nom_maquis, date_echeance: abo.date_echeance, jours_restants: 3 }).catch(() => {})
          }
          envoyerAlerteSuperAdmin({
            nom_maquis, maquis_id: abo.maquis_id,
            type_alerte: 'j3',
            date_echeance: abo.date_echeance,
            jours_restants: 3,
            users
          }).catch(() => {})
          console.log(`[CRON] Rappel J-3 → ${nom_maquis}`)

        // ─── J-7 ───────────────────────────────────────────────
        } else if (joursRestants === 7) {
          for (const u of users) {
            envoyerRappelEcheance({ nom: u.nom, email: u.email, nom_maquis, date_echeance: abo.date_echeance, jours_restants: 7 }).catch(() => {})
          }
          envoyerAlerteSuperAdmin({
            nom_maquis, maquis_id: abo.maquis_id,
            type_alerte: 'j7',
            date_echeance: abo.date_echeance,
            jours_restants: 7,
            users
          }).catch(() => {})
          console.log(`[CRON] Rappel J-7 → ${nom_maquis}`)
        }
      }

      console.log(`[CRON] Vérification terminée — ${abonnements.length} abonnement(s) analysé(s)`)
    } catch (err) {
      console.error('[CRON] Erreur vérification abonnements :', err.message)
    }
  }, { timezone: 'Africa/Abidjan' })

  console.log('[CRON] Scheduler abonnements démarré (tous les jours à 8h00 Abidjan)')
}

module.exports = { lancerCronAbonnements }
