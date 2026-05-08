// ============================================================
// BON D'APPROVISIONNEMENT SERVICE
// Gère la création et consultation des bons d'approvisionnement
// Un bon regroupe plusieurs produits d'une même livraison
// ============================================================

// Crée un bon d'approvisionnement complet
const creerBon = async (prisma, io, data, utilisateur) => {
  const { fournisseur_id, note, lignes } = data

  if (!lignes || lignes.length === 0) {
    throw new Error('Un bon doit contenir au moins un produit')
  }

  // Transaction atomique : tout réussit ou tout échoue
  const bon = await prisma.$transaction(async (tx) => {
    let total_achat = 0
    const lignesPreparees = []

    // Vérifie chaque produit et calcule les totaux
    for (const ligne of lignes) {
      const { produit_id, quantite, prix_achat } = ligne

      if (!produit_id || !quantite) {
        throw new Error('Produit et quantité requis pour chaque ligne')
      }

      const produit = await tx.produit.findFirst({
        where: { id: produit_id, maquis_id: utilisateur.maquis_id, actif: true }
      })

      if (!produit) throw new Error(`Produit introuvable : ID ${produit_id}`)

      const pa = prix_achat ? parseFloat(prix_achat) : 0
      const total_ligne = pa * parseFloat(quantite)
      total_achat += total_ligne

      lignesPreparees.push({
        produit_id,
        quantite: parseFloat(quantite),
        prix_achat: pa,
        total_ligne: parseFloat(total_ligne.toFixed(2))
      })
    }

    // Crée le bon
    const nouveauBon = await tx.bonLivraison.create({
      data: {
        maquis_id: utilisateur.maquis_id,
        fournisseur_id: fournisseur_id ? parseInt(fournisseur_id) : null,
        note,
        total_achat: parseFloat(total_achat.toFixed(2)),
        cree_par: utilisateur.id,
        lignes: {
          create: lignesPreparees
        }
      },
      include: {
        lignes: {
          include: { produit: { select: { nom: true, unite: true } } }
        },
        fournisseur: { select: { nom: true } }
      }
    })

    // Met à jour le stock de chaque produit
    for (const ligne of lignesPreparees) {
      await tx.produit.update({
        where: { id: ligne.produit_id },
        data: { stock_actuel: { increment: ligne.quantite } }
      })

      // Enregistre le mouvement de stock
      await tx.stockMouvement.create({
        data: {
          maquis_id: utilisateur.maquis_id,
          produit_id: ligne.produit_id,
          type_mouvement: 'entree',
          quantite: ligne.quantite,
          raison: `Bon d'approvisionnement #${nouveauBon.id}`,
          utilisateur_id: utilisateur.id,
          valide_par: utilisateur.id,
          valide_at: new Date()
        }
      })
    }

    return nouveauBon
  })

  // Push dashboard temps réel
  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'approvisionnement',
    bon_id: bon.id
  })

  return bon
}

// Récupère la liste des bons d'approvisionnement
const getBons = async (prisma, maquis_id) => {
  return await prisma.bonLivraison.findMany({
    where: { maquis_id },
    include: {
      fournisseur: { select: { nom: true } },
      lignes: {
        include: { produit: { select: { nom: true, unite: true } } }
      }
    },
    orderBy: { date_livraison: 'desc' }
  })
}

module.exports = { creerBon, getBons }