// ============================================================
// PARAMETRAGE SERVICE - Logique métier du paramétrage
// Gère : produits, fournisseurs, utilisateurs, maquis
// Accessible gérant et patron uniquement
// ============================================================

const bcrypt = require('bcryptjs')

// ============================================================
// PRODUITS
// ============================================================

const getProduits = async (prisma, maquis_id) => {
  return await prisma.produit.findMany({
    where: { maquis_id },
    include: { station: { select: { id: true, nom: true, couleur: true } } },
    orderBy: { nom: 'asc' }
  })
}

const creerProduit = async (prisma, maquis_id, data) => {
  const { nom, categorie, prix_vente, prix_achat, stock_actuel, stock_min, unite, station_id } = data

  if (!nom || !prix_vente || !prix_achat) {
    throw new Error('Nom, prix de vente et prix d\'achat requis')
  }

  return await prisma.produit.create({
    data: {
      maquis_id,
      nom,
      categorie,
      prix_vente:   parseFloat(prix_vente),
      prix_achat:   parseFloat(prix_achat),
      stock_actuel: parseFloat(stock_actuel || 0),
      stock_min:    parseFloat(stock_min || 0),
      unite:        unite || 'unité',
      station_id:   station_id ? parseInt(station_id) : null
    },
    include: { station: { select: { id: true, nom: true, couleur: true } } }
  })
}

const modifierProduit = async (prisma, produit_id, maquis_id, data) => {
  const produit = await prisma.produit.findFirst({
    where: { id: produit_id, maquis_id }
  })

  if (!produit) throw new Error('Produit introuvable')

  return await prisma.produit.update({
    where: { id: produit_id },
    data: {
      nom:        data.nom,
      categorie:  data.categorie,
      prix_vente: data.prix_vente ? parseFloat(data.prix_vente) : undefined,
      prix_achat: data.prix_achat ? parseFloat(data.prix_achat) : undefined,
      stock_min:  data.stock_min !== undefined ? parseFloat(data.stock_min) : undefined,
      unite:      data.unite,
      actif:      data.actif !== undefined ? data.actif : undefined,
      station_id: data.station_id !== undefined ? (data.station_id ? parseInt(data.station_id) : null) : undefined
    },
    include: { station: { select: { id: true, nom: true, couleur: true } } }
  })
}

// ============================================================
// FOURNISSEURS
// ============================================================

const getFournisseurs = async (prisma, maquis_id) => {
  return await prisma.fournisseur.findMany({
    where: { maquis_id, actif: true },
    orderBy: { nom: 'asc' }
  })
}

const creerFournisseur = async (prisma, maquis_id, data) => {
  const { nom, telephone, email, adresse } = data
  if (!nom) throw new Error('Le nom du fournisseur est requis')
  return await prisma.fournisseur.create({
    data: { maquis_id, nom, telephone, email, adresse }
  })
}

const modifierFournisseur = async (prisma, fournisseur_id, maquis_id, data) => {
  const fournisseur = await prisma.fournisseur.findFirst({
    where: { id: fournisseur_id, maquis_id }
  })
  if (!fournisseur) throw new Error('Fournisseur introuvable')
  return await prisma.fournisseur.update({
    where: { id: fournisseur_id },
    data: {
      nom:       data.nom,
      telephone: data.telephone,
      email:     data.email,
      adresse:   data.adresse,
      actif:     data.actif !== undefined ? data.actif : undefined
    }
  })
}

// ============================================================
// UTILISATEURS
// ============================================================

const getUtilisateurs = async (prisma, maquis_id) => {
  const liaisons = await prisma.utilisateurMaquis.findMany({
    where: { maquis_id },
    include: {
      utilisateur: {
        select: { id: true, nom: true, email: true, actif: true, created_at: true }
      }
    },
    orderBy: { utilisateur: { nom: 'asc' } }
  })

  return liaisons.map(l => ({
    id:         l.utilisateur.id,
    nom:        l.utilisateur.nom,
    email:      l.utilisateur.email,
    role:       l.role,
    actif:      l.actif,
    created_at: l.utilisateur.created_at
  }))
}

const creerUtilisateur = async (prisma, maquis_id, data) => {
  const { nom, email, mot_de_passe, role } = data

  if (!nom || !email || !mot_de_passe || !role) {
    throw new Error('Nom, email, mot de passe et rôle requis')
  }

  const hash = await bcrypt.hash(mot_de_passe, 10)
  let utilisateur = await prisma.utilisateur.findUnique({ where: { email } })

  if (!utilisateur) {
    utilisateur = await prisma.utilisateur.create({
      data: { nom, email, mot_de_passe: hash, actif: true }
    })
  }

  const liaisonExiste = await prisma.utilisateurMaquis.findUnique({
    where: { utilisateur_id_maquis_id: { utilisateur_id: utilisateur.id, maquis_id } }
  })

  if (liaisonExiste) throw new Error('Cet utilisateur a déjà accès à cet établissement')

  await prisma.utilisateurMaquis.create({
    data: { utilisateur_id: utilisateur.id, maquis_id, role, actif: true }
  })

  return { id: utilisateur.id, nom: utilisateur.nom, email: utilisateur.email, role, actif: true }
}

const modifierUtilisateur = async (prisma, utilisateur_id, maquis_id, data) => {
  const liaison = await prisma.utilisateurMaquis.findUnique({
    where: { utilisateur_id_maquis_id: { utilisateur_id, maquis_id } }
  })

  if (!liaison) throw new Error('Utilisateur introuvable dans cet établissement')

  if (data.role !== undefined || data.actif !== undefined) {
    await prisma.utilisateurMaquis.update({
      where: { utilisateur_id_maquis_id: { utilisateur_id, maquis_id } },
      data: {
        role:  data.role  !== undefined ? data.role  : undefined,
        actif: data.actif !== undefined ? data.actif : undefined
      }
    })
  }

  const updateData = {}
  if (data.nom) updateData.nom = data.nom
  if (data.mot_de_passe) {
    updateData.mot_de_passe = await bcrypt.hash(data.mot_de_passe, 10)
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.utilisateur.update({ where: { id: utilisateur_id }, data: updateData })
  }

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateur_id },
    select: { id: true, nom: true, email: true, actif: true }
  })

  return {
    ...utilisateur,
    role:  data.role  ?? liaison.role,
    actif: data.actif ?? liaison.actif
  }
}

// ============================================================
// MAQUIS - Paramètres + abonnement
// ============================================================

const getMaquis = async (prisma, maquis_id) => {
  return await prisma.maquis.findUnique({
    where: { id: maquis_id },
    include: {
      abonnement: true  // ← inclure l'abonnement pour l'onglet Mon Abonnement
    }
  })
}

const modifierMaquis = async (prisma, maquis_id, data) => {
  return await prisma.maquis.update({
    where: { id: maquis_id },
    data: {
      nom:                    data.nom,
      logo_url:               data.logo_url,
      couleur_primaire:       data.couleur_primaire,
      devise:                 data.devise,
      fuseau_horaire:         data.fuseau_horaire,
      activite:               data.activite,
      module_commandes_actif: data.module_commandes_actif,
      paiement_avant:         data.paiement_avant
    }
  })
}

module.exports = {
  getProduits,     creerProduit,     modifierProduit,
  getFournisseurs, creerFournisseur, modifierFournisseur,
  getUtilisateurs, creerUtilisateur, modifierUtilisateur,
  getMaquis,       modifierMaquis
}