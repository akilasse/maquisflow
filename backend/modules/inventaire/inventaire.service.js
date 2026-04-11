// ============================================================
// INVENTAIRE SERVICE - Logique métier des inventaires
// Gère : création, saisie quantités, clôture, export
// Un seul inventaire en_cours à la fois par maquis
// Clôture uniquement par gérant ou patron
// ============================================================

// Démarre un nouvel inventaire
const creerInventaire = async (prisma, utilisateur) => {
  // Vérifie qu'il n'y a pas déjà un inventaire en cours
  const inventaireEnCours = await prisma.inventaire.findFirst({
    where: {
      maquis_id: utilisateur.maquis_id,
      statut: 'en_cours'
    }
  })

  if (inventaireEnCours) {
    throw new Error(
      `Un inventaire est déjà en cours (ID: ${inventaireEnCours.id}) - Clôturez-le avant d'en créer un nouveau`
    )
  }

  // Récupère tous les produits actifs du maquis
  const produits = await prisma.produit.findMany({
    where: {
      maquis_id: utilisateur.maquis_id,
      actif: true
    }
  })

  if (produits.length === 0) {
    throw new Error('Aucun produit trouvé pour cet inventaire')
  }

  // Crée l'inventaire avec toutes les lignes pré-remplies
  const inventaire = await prisma.inventaire.create({
    data: {
      maquis_id: utilisateur.maquis_id,
      cree_par: utilisateur.id,
      statut: 'en_cours',
      lignes: {
        create: produits.map(produit => ({
          produit_id: produit.id,
          qte_theorique: produit.stock_actuel, // Stock théorique = stock actuel en base
          qte_reelle: 0,                        // A saisir par le gérant
          ecart: 0
        }))
      }
    },
    include: {
      lignes: {
        include: {
          produit: {
            select: { nom: true, unite: true, stock_actuel: true }
          }
        }
      }
    }
  })

  return inventaire
}

// Met à jour la quantité réelle d'une ligne d'inventaire
const mettreAJourLigne = async (prisma, inventaire_id, produit_id, qte_reelle, utilisateur) => {
  // Vérifie que l'inventaire existe et est en cours
  const inventaire = await prisma.inventaire.findFirst({
    where: {
      id: inventaire_id,
      maquis_id: utilisateur.maquis_id,
      statut: 'en_cours'
    }
  })

  if (!inventaire) {
    throw new Error('Inventaire introuvable ou déjà clôturé')
  }

  // Récupère la ligne
  const ligne = await prisma.inventaireLigne.findFirst({
    where: {
      inventaire_id,
      produit_id
    }
  })

  if (!ligne) {
    throw new Error('Ligne d\'inventaire introuvable')
  }

  // Calcule l'écart
  const ecart = qte_reelle - parseFloat(ligne.qte_theorique)

  // Met à jour la ligne
  const ligneMisAJour = await prisma.inventaireLigne.update({
    where: { id: ligne.id },
    data: {
      qte_reelle,
      ecart: parseFloat(ecart.toFixed(3))
    },
    include: {
      produit: { select: { nom: true, unite: true } }
    }
  })

  return ligneMisAJour
}

// Clôture un inventaire et ajuste les stocks
const cloturerInventaire = async (prisma, io, inventaire_id, utilisateur) => {
  // Seul gérant ou patron peut clôturer
  if (utilisateur.role === 'caissier') {
    throw new Error('Accès refusé - Gérant ou patron requis pour clôturer')
  }

  const inventaire = await prisma.inventaire.findFirst({
    where: {
      id: inventaire_id,
      maquis_id: utilisateur.maquis_id,
      statut: 'en_cours'
    },
    include: { lignes: true }
  })

  if (!inventaire) {
    throw new Error('Inventaire introuvable ou déjà clôturé')
  }

  // Transaction : clôture + ajustements stock
  const resultat = await prisma.$transaction(async (tx) => {
    // Pour chaque ligne avec un écart
    for (const ligne of inventaire.lignes) {
      if (parseFloat(ligne.ecart) !== 0) {
        // Ajuste le stock réel
        await tx.produit.update({
          where: { id: ligne.produit_id },
          data: { stock_actuel: ligne.qte_reelle }
        })

        // Enregistre le mouvement d'ajustement
        await tx.stockMouvement.create({
          data: {
            maquis_id: utilisateur.maquis_id,
            produit_id: ligne.produit_id,
            type_mouvement: 'ajustement',
            quantite: Math.abs(parseFloat(ligne.ecart)),
            raison: `Ajustement inventaire #${inventaire_id} - Écart : ${ligne.ecart}`,
            utilisateur_id: utilisateur.id,
            valide_par: utilisateur.id,
            valide_at: new Date()
          }
        })
      }
    }

    // Clôture l'inventaire
    const inventaireCloture = await tx.inventaire.update({
      where: { id: inventaire_id },
      data: {
        statut: 'cloture',
        date_fin: new Date(),
        cloture_par: utilisateur.id
      },
      include: {
        lignes: {
          include: {
            produit: { select: { nom: true, unite: true } }
          }
        }
      }
    })

    return inventaireCloture
  })

  // Push dashboard
  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'inventaire_cloture',
    inventaire_id
  })

  return resultat
}

// Récupère un inventaire avec ses lignes
const getInventaire = async (prisma, inventaire_id, maquis_id) => {
  const inventaire = await prisma.inventaire.findFirst({
    where: {
      id: inventaire_id,
      maquis_id
    },
    include: {
      lignes: {
        include: {
          produit: { select: { nom: true, unite: true, categorie: true } }
        }
      }
    }
  })

  if (!inventaire) {
    throw new Error('Inventaire introuvable')
  }

  return inventaire
}

// Récupère la liste des inventaires
const getInventaires = async (prisma, maquis_id) => {
  const inventaires = await prisma.inventaire.findMany({
    where: { maquis_id },
    orderBy: { date_debut: 'desc' }
  })

  return inventaires
}

module.exports = {
  creerInventaire,
  mettreAJourLigne,
  cloturerInventaire,
  getInventaire,
  getInventaires
}