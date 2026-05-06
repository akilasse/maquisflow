// ============================================================
// AUTH SERVICE - Logique métier de l'authentification
// Supporte multi-établissements — sélection après login
// ============================================================

const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')

const genererAccessToken = (utilisateur) => {
  return jwt.sign(
    { id: utilisateur.id, role: utilisateur.role, maquis_id: utilisateur.maquis_id, type: utilisateur.type },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

const genererRefreshToken = (utilisateur) => {
  return jwt.sign({ id: utilisateur.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
}

// ============================================================
// VERIFICATION ABONNEMENT
// ============================================================
const verifierAbonnement = (maquis) => {
  if (!maquis.abonnement) return
  const abo = maquis.abonnement
  if (abo.type_acces === 'achat_unique') return
  if (abo.statut === 'suspendu') throw new Error('Votre abonnement a été suspendu. Contactez Flowix pour le renouveler.')
  if (abo.date_echeance && new Date(abo.date_echeance) < new Date()) throw new Error('Votre abonnement a expiré. Veuillez renouveler pour continuer.')
  if (abo.bloque) throw new Error('Votre accès a été bloqué. Veuillez contacter Flowix.')
}

// ============================================================
// LOGIN - Retourne tous les établissements de l'utilisateur
// ============================================================
const login = async (prisma, email, mot_de_passe) => {

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { email },
    include: {
      etablissements: {
        where: { actif: true },
        include: {
          maquis: {
            select: {
              id: true, nom: true, type: true, activite: true,
              logo_url: true, couleur_primaire: true, devise: true,
              actif: true, abonnement: true,
              module_commandes_actif: true, module_kds_actif: true,
              module_commandes_direct: true, paiement_avant: true
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

  const etablissementsActifs = utilisateur.etablissements.filter(e => e.maquis?.actif)

  if (etablissementsActifs.length === 0) {
    throw new Error('Vous n\'avez accès à aucun établissement actif')
  }

  const refreshToken = genererRefreshToken(utilisateur)

  // Un seul établissement → connexion directe
  if (etablissementsActifs.length === 1) {
    const liaison = etablissementsActifs[0]
    const maquis  = liaison.maquis
    verifierAbonnement(maquis)
    const { abonnement, ...maquisSansAbo } = maquis
    const accessToken = genererAccessToken({ id: utilisateur.id, role: liaison.role, maquis_id: maquis.id, type: maquis.type })
    return {
      accessToken, refreshToken, selection_requise: false,
      utilisateur: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, role: liaison.role, maquis: maquisSansAbo }
    }
  }

  // Plusieurs établissements → sélection requise
  const etablissements = etablissementsActifs.map(e => ({
    maquis_id:        e.maquis.id,
    nom:              e.maquis.nom,
    type:             e.maquis.type,
    activite:         e.maquis.activite,
    logo_url:         e.maquis.logo_url,
    couleur_primaire: e.maquis.couleur_primaire,
    role:             e.role
  }))

  return {
    refreshToken, selection_requise: true,
    utilisateur: { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email },
    etablissements
  }
}

// ============================================================
// SELECTIONNER ETABLISSEMENT
// ============================================================
const selectionnerEtablissement = async (prisma, utilisateur_id, maquis_id) => {
  const liaison = await prisma.utilisateurMaquis.findFirst({
    where: { utilisateur_id, maquis_id, actif: true },
    include: {
      maquis: {
        select: { id: true, nom: true, type: true, activite: true, logo_url: true, couleur_primaire: true, devise: true, actif: true, abonnement: true }
      },
      utilisateur: { select: { id: true, nom: true, email: true } }
    }
  })

  if (!liaison) throw new Error('Établissement introuvable ou accès refusé')

  const maquis = liaison.maquis
  verifierAbonnement(maquis)

  const { abonnement, ...maquisSansAbo } = maquis
  const accessToken = genererAccessToken({ id: utilisateur_id, role: liaison.role, maquis_id: maquis.id, type: maquis.type })

  return {
    accessToken,
    utilisateur: { id: liaison.utilisateur.id, nom: liaison.utilisateur.nom, email: liaison.utilisateur.email, role: liaison.role, maquis: maquisSansAbo }
  }
}

// ============================================================
// REFRESH TOKEN
// ============================================================
const refreshToken = async (prisma, token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: decoded.id } })
    if (!utilisateur || !utilisateur.actif) throw new Error('Utilisateur introuvable ou désactivé')
    const liaison = await prisma.utilisateurMaquis.findFirst({
      where: { utilisateur_id: utilisateur.id, actif: true },
      include: { maquis: { select: { id: true, type: true } } }
    })
    if (!liaison) throw new Error('Aucun établissement accessible')
    const accessToken = genererAccessToken({ id: utilisateur.id, role: liaison.role, maquis_id: liaison.maquis_id, type: liaison.maquis.type })
    return { accessToken }
  } catch (error) {
    throw new Error('Refresh token invalide ou expiré')
  }
}

module.exports = { login, selectionnerEtablissement, refreshToken }