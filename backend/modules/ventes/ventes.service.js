// ============================================================
// VENTES SERVICE - Logique métier des ventes
// Prix flexible : le caissier peut modifier le prix unitaire
// Si prix < 80% du catalogue → validation gérant requise
// Transaction atomique : tout réussit ou tout échoue
// ============================================================

// Seuil en dessous duquel une validation gérant est requise
const SEUIL_VALIDATION = 0.80 // 80% du prix catalogue

const creerVente = async (prisma, io, data, utilisateur) => {
  const { lignes, mode_paiement, note } = data

  // Vérifie que les lignes sont présentes
  if (!lignes || lignes.length === 0) {
    throw new Error('Une vente doit contenir au moins un produit')
  }

  // Vérifie le mode de paiement
  const modesValides = ['especes', 'wave', 'orange_money', 'mtn_money', 'credit', 'autre']
  if (!modesValides.includes(mode_paiement)) {
    throw new Error('Mode de paiement invalide')
  }

  // Transaction atomique
  const vente = await prisma.$transaction(async (tx) => {

    let total_net = 0
    const lignesPreparees = []
    let necessite_validation = false

    for (const ligne of lignes) {
      const { produit_id, quantite, prix_applique } = ligne

      // Récupère le produit
      const produit = await tx.produit.findFirst({
        where: {
          id: produit_id,
          maquis_id: utilisateur.maquis_id,
          actif: true
        }
      })

      if (!produit) {
        throw new Error(`Produit introuvable : ID ${produit_id}`)
      }

      // Vérifie le stock
      if (parseFloat(produit.stock_actuel) < quantite) {
        throw new Error(
          `Stock insuffisant pour "${produit.nom}" - Disponible : ${produit.stock_actuel} ${produit.unite}`
        )
      }

      // Prix final : prix saisi par le caissier ou prix catalogue si rien saisi
      const prix_catalogue = parseFloat(produit.prix_vente)
      const prix_final = prix_applique ? parseFloat(prix_applique) : prix_catalogue

      // Vérifie si le prix est trop bas → validation gérant requise
      if (prix_final < prix_catalogue * SEUIL_VALIDATION) {
        necessite_validation = true
      }

      // Calcul du total ligne
      const total_ligne = prix_final * quantite

      // Calcul de l'écart par rapport au prix catalogue (pour le rapport patron)
      const economie_client = (prix_catalogue - prix_final) * quantite

      total_net += total_ligne

      lignesPreparees.push({
        produit_id,
        quantite,
        prix_unitaire: prix_final,        // Prix réellement appliqué
        prix_catalogue,                    // Prix normal du catalogue
        economie_client,                   // Écart visible uniquement par le patron
        remise_ligne: 0,                   // Conservé pour compatibilité
        total_ligne: parseFloat(total_ligne.toFixed(2)),
        produit
      })
    }

    // Si prix trop bas et caissier (pas gérant/patron) → blocage
    if (necessite_validation && utilisateur.role === 'caissier') {
      throw new Error(
        'Prix trop bas détecté - Validation du gérant requise pour continuer'
      )
    }

    // Crée la vente
    const nouvelleVente = await tx.vente.create({
      data: {
        maquis_id: utilisateur.maquis_id,
        caissier_id: utilisateur.id,
        total_brut: parseFloat(total_net.toFixed(2)),
        remise_globale: 0,
        total_net: parseFloat(total_net.toFixed(2)),
        mode_paiement,
        statut: mode_paiement === 'credit' ? 'credit_en_cours' : 'encaissee',
        note,
        lignes: {
  create: lignesPreparees.map(l => ({
    produit_id: l.produit_id,
    quantite: l.quantite,
    prix_unitaire: l.prix_unitaire,
    prix_catalogue: l.prix_catalogue,
    economie_client: parseFloat(l.economie_client.toFixed(2)),
    remise_ligne: l.remise_ligne,
    total_ligne: l.total_ligne
  }))
}
      },
      include: {
        lignes: {
          include: {
            produit: { select: { nom: true, unite: true } }
          }
        }
      }
    })

    // Décrémente le stock et crée les mouvements
    for (const ligne of lignesPreparees) {
      const produitMisAJour = await tx.produit.update({
        where: { id: ligne.produit_id },
        data: { stock_actuel: { decrement: ligne.quantite } }
      })

      // Mouvement de stock
      await tx.stockMouvement.create({
        data: {
          maquis_id: utilisateur.maquis_id,
          produit_id: ligne.produit_id,
          type_mouvement: 'sortie_vente',
          quantite: ligne.quantite,
          raison: `Vente #${nouvelleVente.id} - Prix appliqué : ${ligne.prix_unitaire} XOF`,
          utilisateur_id: utilisateur.id
        }
      })

      // Alerte stock bas
      if (parseFloat(produitMisAJour.stock_actuel) <= parseFloat(produitMisAJour.stock_min)) {
        io.to(`maquis_${utilisateur.maquis_id}`).emit('stock:alerte', {
          produit_id: ligne.produit_id,
          nom: ligne.produit.nom,
          stock_actuel: produitMisAJour.stock_actuel,
          stock_min: produitMisAJour.stock_min,
          message: `Stock bas pour ${ligne.produit.nom}`
        })
      }
    }

    return nouvelleVente
  })

  // Push dashboard temps réel
  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', {
    type: 'nouvelle_vente',
    vente_id: vente.id,
    total_net: vente.total_net,
    mode_paiement: vente.mode_paiement,
    date: vente.date_vente
  })

  return vente
}

// Récupère les ventes avec filtres
const getVentes = async (prisma, maquis_id, filtres = {}) => {
  const { date_debut, date_fin, mode_paiement, statut, serveur, numero_facture, caissier_nom } = filtres

  const debut = (() => { const d = new Date(date_debut || new Date().toISOString().slice(0,10)); d.setUTCHours(0,0,0,0); return d })()
  const fin   = (() => { const d = new Date(date_fin   || new Date().toISOString().slice(0,10)); d.setUTCHours(23,59,59,999); return d })()

  const where = {
    maquis_id,
    date_vente: { gte: debut, lte: fin }
  }

  if (mode_paiement) where.mode_paiement = mode_paiement
  if (statut) where.statut = statut
  if (serveur) where.serveur_nom = { contains: serveur }
  if (numero_facture) where.id = parseInt(numero_facture) || undefined
  if (caissier_nom) where.caissier = { nom: { contains: caissier_nom } }

  const ventes = await prisma.vente.findMany({
    where,
    include: {
      caissier: { select: { nom: true } },
      lignes: {
        include: {
          produit: { select: { nom: true, unite: true } }
        }
      }
    },
    orderBy: { date_vente: 'desc' }
  })

  return ventes
}

// Retourner une vente encaissée en attente (gérant/patron)
const retourEnAttente = async (prisma, venteId, utilisateur) => {
  const vente = await prisma.vente.findFirst({
    where: { id: venteId, maquis_id: utilisateur.maquis_id }
  })
  if (!vente) throw new Error('Vente introuvable')
  if (vente.statut !== 'encaissee') throw new Error('Seules les ventes encaissées peuvent être remises en attente')

  return prisma.vente.update({
    where: { id: venteId },
    data: { statut: 'en_attente' }
  })
}

// Appliquer une réduction après encaissement (gérant/patron)
const appliquerReduction = async (prisma, io, venteId, data, utilisateur) => {
  const { montant, motif } = data
  if (!montant || parseFloat(montant) <= 0) throw new Error('Montant de réduction invalide')
  if (!motif || !motif.trim()) throw new Error('Le motif de réduction est obligatoire')

  const vente = await prisma.vente.findFirst({
    where: { id: venteId, maquis_id: utilisateur.maquis_id }
  })
  if (!vente) throw new Error('Vente introuvable')
  if (['annulee'].includes(vente.statut)) throw new Error('Impossible de modifier une vente annulée')

  const reduction = parseFloat(montant)
  if (reduction >= parseFloat(vente.total_net)) throw new Error('La réduction ne peut pas dépasser le total')

  const venteMaj = await prisma.vente.update({
    where: { id: venteId },
    data: {
      reduction_montant: reduction,
      reduction_motif:   motif.trim(),
      reduction_par:     utilisateur.id,
      total_net:         parseFloat((parseFloat(vente.total_net) - reduction).toFixed(2))
    }
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', { type: 'reduction', vente_id: venteId })
  return venteMaj
}

// Annuler une vente avec motif obligatoire + restock (gérant/patron)
const annulerVente = async (prisma, io, venteId, motif, utilisateur) => {
  if (!motif || !motif.trim()) throw new Error('Le motif d\'annulation est obligatoire')

  const vente = await prisma.vente.findFirst({
    where: { id: venteId, maquis_id: utilisateur.maquis_id },
    include: { lignes: true }
  })
  if (!vente) throw new Error('Vente introuvable')
  if (vente.statut === 'annulee') throw new Error('Vente déjà annulée')

  await prisma.$transaction(async (tx) => {
    await tx.vente.update({
      where: { id: venteId },
      data: {
        statut:           'annulee',
        annulation_motif: motif.trim(),
        annule_par:       utilisateur.id
      }
    })

    // Restock pour chaque ligne
    for (const ligne of vente.lignes) {
      await tx.produit.update({
        where: { id: ligne.produit_id },
        data: { stock_actuel: { increment: ligne.quantite } }
      })
      await tx.stockMouvement.create({
        data: {
          maquis_id:      utilisateur.maquis_id,
          produit_id:     ligne.produit_id,
          type_mouvement: 'ajustement',
          quantite:       parseFloat(ligne.quantite),
          raison:         `Annulation vente #${venteId} — ${motif}`,
          utilisateur_id: utilisateur.id
        }
      })
    }
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', { type: 'annulation', vente_id: venteId })
  return { message: 'Vente annulée et stock rétabli' }
}

module.exports = {
  creerVente,
  getVentes,
  retourEnAttente,
  appliquerReduction,
  annulerVente
}