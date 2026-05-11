// ============================================================
// STOCK SERVICE - Logique métier des mouvements de stock
// Gère : entrées, sorties manuelles, historique
// Sorties manuelles nécessitent validation gérant
// ============================================================

// Entrée de stock (réception marchandise)
const entreeStock = async (prisma, io, data, utilisateur) => {
  const { produit_id, quantite, raison } = data

  if (!produit_id || !quantite || quantite <= 0) {
    throw new Error('Produit et quantité requis')
  }

  // Vérifie que le produit appartient au maquis
  const produit = await prisma.produit.findFirst({
    where: {
      id: produit_id,
      maquis_id: utilisateur.maquis_id,
      actif: true
    }
  })

  if (!produit) {
    throw new Error('Produit introuvable')
  }

  // Transaction : met à jour le stock + crée le mouvement
  const resultat = await prisma.$transaction(async (tx) => {
    // Incrémente le stock
    const produitMisAJour = await tx.produit.update({
      where: { id: produit_id },
      data: { stock_actuel: { increment: quantite } }
    })

    // Enregistre le mouvement
    const mouvement = await tx.stockMouvement.create({
      data: {
        maquis_id: utilisateur.maquis_id,
        produit_id,
        type_mouvement: 'entree',
        quantite,
        raison: raison || 'Entrée de stock',
        utilisateur_id: utilisateur.id,
        valide_par: utilisateur.id,
        valide_at: new Date()
      }
    })

    return { produit: produitMisAJour, mouvement }
  })

  // Push dashboard temps réel
  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'stock_entree',
    produit_id,
    nouveau_stock: resultat.produit.stock_actuel
  })

  return resultat
}

const sortieManuellStock = async (prisma, io, data, utilisateur) => {
  const { lignes, note } = data

  if (!lignes || lignes.length === 0) {
    throw new Error('Ajoutez au moins un produit')
  }

  if (utilisateur.role === 'caissier') {
    throw new Error('Accès refusé - Gérant ou patron requis')
  }

  const resultat = await prisma.$transaction(async (tx) => {
    const mouvements = []

    for (const ligne of lignes) {
      const { produit_id, quantite, raison } = ligne

      if (!produit_id || !quantite || !raison) {
        throw new Error('Produit, quantité et raison requis pour chaque ligne')
      }

      const produit = await tx.produit.findFirst({
        where: { id: produit_id, maquis_id: utilisateur.maquis_id, actif: true }
      })

      if (!produit) throw new Error(`Produit introuvable : ID ${produit_id}`)

      if (parseFloat(produit.stock_actuel) < parseFloat(quantite)) {
        throw new Error(`Stock insuffisant pour ${produit.nom} — Disponible : ${produit.stock_actuel} ${produit.unite}`)
      }

      const produitMisAJour = await tx.produit.update({
        where: { id: produit_id },
        data: { stock_actuel: { decrement: parseFloat(quantite) } }
      })

      await tx.stockMouvement.create({
        data: {
          maquis_id: utilisateur.maquis_id,
          produit_id,
          type_mouvement: 'sortie_manuelle',
          quantite: parseFloat(quantite),
          raison: note ? `${raison} — ${note}` : raison,
          utilisateur_id: utilisateur.id,
          valide_par: utilisateur.id,
          valide_at: new Date()
        }
      })

      if (parseFloat(produitMisAJour.stock_actuel) <= parseFloat(produit.stock_min)) {
        io.to(`maquis_${utilisateur.maquis_id}`).emit('stock:alerte', {
          produit_id,
          nom: produit.nom,
          stock_actuel: produitMisAJour.stock_actuel,
          stock_min: produit.stock_min
        })
      }

      mouvements.push({ produit: produitMisAJour })
    }

    return mouvements
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'stock_sortie'
  })

  return resultat
}

// Historique des mouvements avec filtres
const getHistorique = async (prisma, maquis_id, filtres = {}) => {
  const { produit_id, type_mouvement, date_debut, date_fin, page = 1, limite = 20 } = filtres

  const debut = date_debut
    ? new Date(date_debut)
    : new Date(new Date().setHours(0, 0, 0, 0))
  const fin = date_fin
    ? new Date(date_fin)
    : new Date(new Date().setHours(23, 59, 59, 999))

  const where = {
    maquis_id,
    date_mouvement: { gte: debut, lte: fin }
  }

  if (produit_id) where.produit_id = parseInt(produit_id)
  if (type_mouvement) where.type_mouvement = type_mouvement

  const [mouvements, total] = await prisma.$transaction([
    prisma.stockMouvement.findMany({
      where,
      include: {
        produit: { select: { nom: true, unite: true } },
        utilisateur: { select: { nom: true } }
      },
      orderBy: { date_mouvement: 'desc' },
      skip: (page - 1) * limite,
      take: parseInt(limite)
    }),
    prisma.stockMouvement.count({ where })
  ])

  return {
    mouvements,
    pagination: {
      total,
      page: parseInt(page),
      limite: parseInt(limite),
      pages: Math.ceil(total / limite)
    }
  }
}

// Liste des produits avec leurs stocks
const getProduits = async (prisma, maquis_id) => {
  return await prisma.produit.findMany({
    where: { maquis_id, actif: true },
    include: { variantes: { where: { actif: true }, orderBy: { coefficient: 'desc' } } },
    orderBy: { nom: 'asc' }
  })
}

module.exports = {
  entreeStock,
  sortieManuellStock,
  getHistorique,
  getProduits
}