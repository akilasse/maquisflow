// ============================================================
// INVENTAIRE SERVICE - Logique métier des inventaires
// ============================================================

const creerInventaire = async (prisma, utilisateur) => {
  const inventaireEnCours = await prisma.inventaire.findFirst({
    where: { maquis_id: utilisateur.maquis_id, statut: 'en_cours' }
  })

  if (inventaireEnCours) {
    throw new Error(`Un inventaire est déjà en cours (ID: ${inventaireEnCours.id}) - Clôturez-le avant d'en créer un nouveau`)
  }

  const produits = await prisma.produit.findMany({
    where: { maquis_id: utilisateur.maquis_id, actif: true },
    include: { variantes: { where: { actif: true } } }
  })

  if (produits.length === 0) {
    throw new Error('Aucun produit trouvé pour cet inventaire')
  }

  const inventaire = await prisma.inventaire.create({
    data: {
      maquis_id: utilisateur.maquis_id,
      cree_par: utilisateur.id,
      statut: 'en_cours',
      lignes: {
        create: produits.map(produit => ({
          produit_id: produit.id,
          qte_theorique: produit.stock_actuel,
          qte_reelle: 0,
          ecart: 0
        }))
      }
    },
    include: {
      lignes: {
        include: {
          produit: { select: { nom: true, unite: true, stock_actuel: true } }
        }
      }
    }
  })

  return inventaire
}

// ──────────────────────────────────────────────────────────────
// mettreAJourLigne
//   qte_base         : bouteilles entières comptées
//   variantes_input  : [{ nom, coefficient, quantite }]
//   qte_reelle_total = qte_base + Σ(variante.quantite × variante.coefficient)
// ──────────────────────────────────────────────────────────────
const mettreAJourLigne = async (prisma, inventaire_id, produit_id, qte_base, variantes_input, utilisateur) => {
  const inventaire = await prisma.inventaire.findFirst({
    where: { id: inventaire_id, maquis_id: utilisateur.maquis_id, statut: 'en_cours' }
  })

  if (!inventaire) throw new Error('Inventaire introuvable ou déjà clôturé')

  const ligne = await prisma.inventaireLigne.findFirst({
    where: { inventaire_id, produit_id }
  })

  if (!ligne) throw new Error('Ligne d\'inventaire introuvable')

  // Calcul total en unité de base
  const totalVariantes = (variantes_input || []).reduce(
    (s, v) => s + parseFloat(v.quantite || 0) * parseFloat(v.coefficient || 0), 0
  )
  const qte_reelle = parseFloat(qte_base || 0) + totalVariantes
  const ecart = qte_reelle - parseFloat(ligne.qte_theorique)

  // Stockage du détail variantes (null si aucune variante)
  const vcData = (variantes_input && variantes_input.length > 0)
    ? { base: parseFloat(qte_base || 0), variantes: variantes_input }
    : null

  const ligneMisAJour = await prisma.inventaireLigne.update({
    where: { id: ligne.id },
    data: {
      qte_reelle:         parseFloat(qte_reelle.toFixed(3)),
      ecart:              parseFloat(ecart.toFixed(3)),
      variantes_comptees: vcData
    },
    include: { produit: { select: { nom: true, unite: true } } }
  })

  return ligneMisAJour
}

const cloturerInventaire = async (prisma, io, inventaire_id, utilisateur) => {
  if (utilisateur.role === 'caissier') {
    throw new Error('Accès refusé - Gérant ou patron requis pour clôturer')
  }

  const inventaire = await prisma.inventaire.findFirst({
    where: { id: inventaire_id, maquis_id: utilisateur.maquis_id, statut: 'en_cours' },
    include: { lignes: true }
  })

  if (!inventaire) throw new Error('Inventaire introuvable ou déjà clôturé')

  const resultat = await prisma.$transaction(async (tx) => {
    for (const ligne of inventaire.lignes) {
      if (parseFloat(ligne.ecart) !== 0) {
        await tx.produit.update({
          where: { id: ligne.produit_id },
          data: { stock_actuel: ligne.qte_reelle }
        })

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

    const inventaireCloture = await tx.inventaire.update({
      where: { id: inventaire_id },
      data: { statut: 'cloture', date_fin: new Date(), cloture_par: utilisateur.id },
      include: {
        lignes: { include: { produit: { select: { nom: true, unite: true } } } }
      }
    })

    return inventaireCloture
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'inventaire_cloture', inventaire_id
  })

  return resultat
}

// Annule un inventaire en cours sans ajuster les stocks (conserve l'historique avec motif)
const annulerInventaire = async (prisma, inventaire_id, utilisateur, motif) => {
  if (utilisateur.role === 'caissier') {
    throw new Error('Accès refusé - Gérant ou patron requis pour annuler')
  }

  const inventaire = await prisma.inventaire.findFirst({
    where: { id: inventaire_id, maquis_id: utilisateur.maquis_id, statut: 'en_cours' }
  })

  if (!inventaire) throw new Error('Inventaire introuvable ou déjà clôturé')

  await prisma.inventaireLigne.deleteMany({ where: { inventaire_id } })
  await prisma.inventaire.update({
    where: { id: inventaire_id },
    data: {
      statut: 'annule',
      motif_annulation: motif || null,
      annule_par: utilisateur.id,
      date_annulation: new Date()
    }
  })

  return true
}

const getInventaire = async (prisma, inventaire_id, maquis_id) => {
  const inventaire = await prisma.inventaire.findFirst({
    where: { id: inventaire_id, maquis_id },
    include: {
      lignes: {
        include: {
          produit: {
            select: {
              nom: true, unite: true, categorie: true,
              variantes: { where: { actif: true }, orderBy: { nom: 'asc' } }
            }
          }
        },
        orderBy: { produit: { nom: 'asc' } }
      }
    }
  })

  if (!inventaire) throw new Error('Inventaire introuvable')

  const createur = await prisma.utilisateur.findUnique({ where: { id: inventaire.cree_par }, select: { nom: true } })
  inventaire.createur_nom = createur?.nom || 'Inconnu'

  return inventaire
}

const getInventaires = async (prisma, maquis_id) => {
  const inventaires = await prisma.inventaire.findMany({
    where: { maquis_id },
    orderBy: { date_debut: 'desc' }
  })

  const ids = [...new Set(inventaires.filter(i => i.annule_par).map(i => i.annule_par))]
  const users = ids.length > 0
    ? await prisma.utilisateur.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true } })
    : []
  const userMap = Object.fromEntries(users.map(u => [u.id, u.nom]))

  return inventaires.map(inv => ({
    ...inv,
    annuleur_nom: inv.annule_par ? (userMap[inv.annule_par] || 'Inconnu') : null
  }))
}

module.exports = {
  creerInventaire,
  mettreAJourLigne,
  cloturerInventaire,
  annulerInventaire,
  getInventaire,
  getInventaires
}