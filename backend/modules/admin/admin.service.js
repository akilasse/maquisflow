// ============================================================
// ADMIN SERVICE - Logique métier du panneau super admin
// Accessible uniquement par Tia Kan-nan
// ============================================================

const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')

// ── Login super admin ──────────────────────────────────────
const login = async (prisma, email, mot_de_passe) => {
  const admin = await prisma.superAdmin.findUnique({ where: { email } })

  if (!admin) throw new Error('Email ou mot de passe incorrect')
  if (!admin.actif) throw new Error('Compte désactivé')

  const valide = await bcrypt.compare(mot_de_passe, admin.mot_de_passe)
  if (!valide) throw new Error('Email ou mot de passe incorrect')

  const token = jwt.sign(
    { id: admin.id, role: 'super_admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )

  return { token, admin: { id: admin.id, nom: admin.nom, email: admin.email } }
}

// ── Dashboard global ───────────────────────────────────────
const getDashboard = async (prisma) => {
  const [totalMaquis, totalUtilisateurs, abonnementsActifs, abonnementsExpires, revenusTotal] = await Promise.all([
    prisma.maquis.count({ where: { actif: true } }),
    prisma.utilisateur.count({ where: { actif: true } }),
    prisma.abonnement.count({ where: { statut: 'actif' } }),
    prisma.abonnement.count({ where: { statut: 'expire' } }),
    prisma.abonnement.aggregate({ where: { statut: 'actif' }, _sum: { montant: true } })
  ])

  return {
    totalMaquis,
    totalUtilisateurs,
    abonnementsActifs,
    abonnementsExpires,
    revenusMensuels: parseFloat(revenusTotal._sum.montant || 0)
  }
}

// ── Liste tous les établissements ──────────────────────────
const getMaquis = async (prisma) => {
  const maquis = await prisma.maquis.findMany({
    include: {
      abonnement: true,
      utilisateurs: {
        include: {
          utilisateur: { select: { id: true, nom: true, email: true, actif: true } }
        }
      },
      _count: { select: { ventes: true, produits: true } }
    },
    orderBy: { created_at: 'desc' }
  })

  return maquis.map(m => ({
    id:               m.id,
    nom:              m.nom,
    type:             m.type,
    actif:            m.actif,
    couleur_primaire: m.couleur_primaire,
    devise:           m.devise,
    created_at:       m.created_at,
    abonnement:       m.abonnement,
    nb_utilisateurs:  m.utilisateurs.length,
    nb_ventes:        m._count.ventes,
    nb_produits:      m._count.produits,
    utilisateurs:     m.utilisateurs.map(u => ({
      id:    u.utilisateur.id,
      nom:   u.utilisateur.nom,
      email: u.utilisateur.email,
      role:  u.role,
      actif: u.actif
    }))
  }))
}

// ── Créer un établissement ─────────────────────────────────
// type_acces : 'achat_unique' | 'abonnement'
// periodicite : 'mensuel' | 'annuel' (seulement si abonnement)
// date_echeance : null si achat_unique, calculée par le frontend si abonnement
const creerMaquis = async (prisma, data) => {
  const {
    nom, type, couleur_primaire, devise,
    type_acces   = 'abonnement',
    periodicite  = 'mensuel',
    montant      = 35000,
    date_echeance = null
  } = data

  if (!nom || !type) throw new Error('Nom et type requis')

  // Calcule la date d'échéance selon le type d'accès
  let echeance = null
  if (type_acces === 'abonnement') {
    if (date_echeance) {
      echeance = new Date(date_echeance)
    } else {
      echeance = new Date()
      if (periodicite === 'annuel') {
        echeance.setFullYear(echeance.getFullYear() + 1)
      } else {
        echeance.setMonth(echeance.getMonth() + 1)
      }
    }
  }
  // achat_unique → echeance reste null (accès permanent)

  const maquis = await prisma.maquis.create({
    data: {
      nom,
      type,
      couleur_primaire: couleur_primaire || (type === 'restaurant' ? '#1D4ED8' : '#FF6B35'),
      devise:           devise || 'XOF',
      actif:            true,
      abonnement: {
        create: {
          type_acces,
          periodicite:   type_acces === 'abonnement' ? periodicite : null,
          statut:        'actif',
          montant:       parseFloat(montant),
          date_echeance: echeance,
          bloque:        false,
          note:          type_acces === 'achat_unique'
            ? 'Accès permanent — achat unique'
            : `Abonnement ${periodicite}`
        }
      }
    },
    include: { abonnement: true }
  })

  return maquis
}

// ── Modifier un établissement ──────────────────────────────
const modifierMaquis = async (prisma, maquis_id, data) => {
  return await prisma.maquis.update({
    where: { id: maquis_id },
    data: {
      nom:              data.nom,
      couleur_primaire: data.couleur_primaire,
      devise:           data.devise,
      actif:            data.actif !== undefined ? data.actif : undefined
    }
  })
}

// ── Gérer l'abonnement ─────────────────────────────────────
const modifierAbonnement = async (prisma, maquis_id, data) => {
  const { statut, montant, date_echeance, mode_paiement, reference, note } = data

  // Renouvellement → calcule +1 mois depuis l'échéance actuelle ou aujourd'hui
  let nouvelleEcheance = date_echeance ? new Date(date_echeance) : undefined
  if (statut === 'actif' && !date_echeance) {
    const aboCurrent = await prisma.abonnement.findUnique({ where: { maquis_id } })
    // Si abonnement à achat unique, on ne change pas l'échéance
    if (aboCurrent?.type_acces === 'achat_unique') {
      nouvelleEcheance = null
    } else {
      const base = aboCurrent?.date_echeance > new Date() ? aboCurrent.date_echeance : new Date()
      nouvelleEcheance = new Date(base)
      nouvelleEcheance.setMonth(nouvelleEcheance.getMonth() + 1)
    }
  }

  return await prisma.abonnement.upsert({
    where:  { maquis_id },
    update: {
      statut,
      montant:       montant ? parseFloat(montant) : undefined,
      date_echeance: nouvelleEcheance,
      date_paiement: statut === 'actif' ? new Date() : undefined,
      bloque:        statut === 'suspendu' ? true : statut === 'actif' ? false : undefined,
      mode_paiement,
      reference,
      note,
      updated_at:    new Date()
    },
    create: {
      maquis_id,
      statut:        statut || 'actif',
      montant:       montant ? parseFloat(montant) : 35000,
      date_echeance: nouvelleEcheance || new Date(),
      mode_paiement,
      reference,
      note
    }
  })
}

// ── Créer un utilisateur pour un établissement ─────────────
const creerUtilisateur = async (prisma, data) => {
  const { nom, email, mot_de_passe, role, maquis_id } = data

  if (!nom || !email || !mot_de_passe || !role || !maquis_id) {
    throw new Error('Tous les champs sont requis')
  }

  const hash = await bcrypt.hash(mot_de_passe, 10)

  let utilisateur = await prisma.utilisateur.findUnique({ where: { email } })

  if (!utilisateur) {
    utilisateur = await prisma.utilisateur.create({
      data: { nom, email, mot_de_passe: hash, actif: true }
    })
  }

  const liaisonExiste = await prisma.utilisateurMaquis.findUnique({
    where: {
      utilisateur_id_maquis_id: {
        utilisateur_id: utilisateur.id,
        maquis_id:      parseInt(maquis_id)
      }
    }
  })

  if (liaisonExiste) throw new Error('Cet utilisateur a déjà accès à cet établissement')

  await prisma.utilisateurMaquis.create({
    data: { utilisateur_id: utilisateur.id, maquis_id: parseInt(maquis_id), role, actif: true }
  })

  return { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, role }
}

// ── Désactiver/activer un utilisateur ─────────────────────
const toggleUtilisateur = async (prisma, utilisateur_id, maquis_id, actif) => {
  return await prisma.utilisateurMaquis.update({
    where: {
      utilisateur_id_maquis_id: {
        utilisateur_id: parseInt(utilisateur_id),
        maquis_id:      parseInt(maquis_id)
      }
    },
    data: { actif }
  })
}

module.exports = {
  login, getDashboard, getMaquis,
  creerMaquis, modifierMaquis,
  modifierAbonnement, creerUtilisateur, toggleUtilisateur
}