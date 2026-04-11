// ============================================================
// AUTH SERVICE - Logique métier de l'authentification
// Le type d'établissement (maquis/restaurant) est choisi au login
// Vérifie l'abonnement au login — bloque si expiré
// ============================================================

const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')

const genererAccessToken = (utilisateur) => {
  return jwt.sign(
    {
      id:        utilisateur.id,
      role:      utilisateur.role,
      maquis_id: utilisateur.maquis_id,
      type:      utilisateur.type
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

const genererRefreshToken = (utilisateur) => {
  return jwt.sign(
    { id: utilisateur.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

// ============================================================
// LOGIN
// ============================================================
const login = async (prisma, email, mot_de_passe, type = 'maquis') => {

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email },
    include: {
      etablissements: {
        where: {
          actif: true,
          maquis: { type, actif: true }
        },
        include: {
          maquis: {
            select: {
              id:               true,
              nom:              true,
              type:             true,
              logo_url:         true,
              couleur_primaire: true,
              devise:           true,
              abonnement:       true
            }
          }
        }
      }
    }
  })

  if (!utilisateur) throw new Error('Email ou mot de passe incorrect')
  if (!utilisateur.actif) throw new Error('Ce compte a été désactivé')

  const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe)
  if (!motDePasseValide) throw new Error('Email ou mot de passe incorrect')

  if (utilisateur.etablissements.length === 0) {
    const label = type === 'restaurant' ? 'restaurant' : 'maquis'
    throw new Error(`Vous n'avez pas accès à l'espace ${label}`)
  }

  const liaison = utilisateur.etablissements[0]
  const maquis  = liaison.maquis

  // ── Vérification abonnement ──────────────────────────────
  if (maquis.abonnement) {
    const abo = maquis.abonnement

    // Achat unique → accès permanent, jamais bloqué automatiquement
    if (abo.type_acces === 'abonnement') {

      // Suspendu manuellement par l'admin
      if (abo.statut === 'suspendu') {
        throw new Error('Votre abonnement a été suspendu. Contactez MaquisFlow pour le renouveler.')
      }

      // Date d'échéance dépassée → bloquer automatiquement
      if (abo.date_echeance && new Date(abo.date_echeance) < new Date()) {
        await prisma.abonnement.update({
          where: { maquis_id: maquis.id },
          data:  { statut: 'expire', bloque: true }
        })
        throw new Error('Votre abonnement a expiré. Veuillez renouveler votre abonnement pour continuer.')
      }

      // Bloqué manuellement
      if (abo.bloque) {
        throw new Error('Votre accès a été bloqué. Veuillez contacter MaquisFlow.')
      }
    }
  }
  // ─────────────────────────────────────────────────────────

  const payload = {
    id:        utilisateur.id,
    role:      liaison.role,
    maquis_id: maquis.id,
    type:      maquis.type
  }

  const accessToken  = genererAccessToken(payload)
  const refreshToken = genererRefreshToken(utilisateur)

  // Ne pas retourner les infos d'abonnement au client
  const { abonnement, ...maquisSansAbo } = maquis

  return {
    accessToken,
    refreshToken,
    utilisateur: {
      id:    utilisateur.id,
      nom:   utilisateur.nom,
      email: utilisateur.email,
      role:  liaison.role,
      maquis: maquisSansAbo
    }
  }
}

// ============================================================
// REFRESH TOKEN
// ============================================================
const refreshToken = async (prisma, token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id }
    })

    if (!utilisateur || !utilisateur.actif) {
      throw new Error('Utilisateur introuvable ou désactivé')
    }

    const liaison = await prisma.utilisateurMaquis.findFirst({
      where: { utilisateur_id: utilisateur.id, actif: true },
      include: { maquis: { select: { id: true, type: true } } }
    })

    if (!liaison) throw new Error('Aucun établissement accessible')

    const accessToken = genererAccessToken({
      id:        utilisateur.id,
      role:      liaison.role,
      maquis_id: liaison.maquis_id,
      type:      liaison.maquis.type
    })

    return { accessToken }
  } catch (error) {
    throw new Error('Refresh token invalide ou expiré')
  }
}

module.exports = { login, refreshToken }