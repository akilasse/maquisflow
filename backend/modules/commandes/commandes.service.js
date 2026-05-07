// ============================================================
// COMMANDES SERVICE — Tablette serveur + KDS
// Module optionnel activé par module_commandes_actif sur Maquis
// ============================================================

const STATUTS_OUVERTS = ['ouverte', 'en_attente', 'en_cours', 'prete', 'servie']

// ── Helpers ──────────────────────────────────────────────────

const verifierModule = async (prisma, maquis_id) => {
  const maquis = await prisma.maquis.findUnique({ where: { id: maquis_id } })
  if (!maquis) throw new Error('Établissement introuvable')
  if (!maquis.module_commandes_actif) throw new Error('Module commandes non activé pour cet établissement')
  return maquis
}

const verifierAppartenance = async (prisma, maquis_id, commandeId) => {
  const commande = await prisma.commande.findFirst({
    where: { id: commandeId, maquis_id },
    include: {
      lignes: { include: { produit: true, station: true } },
      table: true,
      serveur: { select: { id: true, nom: true } }
    }
  })
  if (!commande) throw new Error('Commande introuvable')
  return commande
}

// ── Stations ─────────────────────────────────────────────────

const getStations = async (prisma, maquis_id) => {
  return prisma.station.findMany({
    where: { maquis_id, actif: true },
    orderBy: { nom: 'asc' }
  })
}

const creerStation = async (prisma, maquis_id, data) => {
  const { nom, couleur, type } = data
  if (!nom) throw new Error('Le nom de la station est requis')
  return prisma.station.create({
    data: { maquis_id, nom, couleur: couleur || '#6b7280', type: type || 'preparation' }
  })
}

const modifierStation = async (prisma, maquis_id, stationId, data) => {
  const station = await prisma.station.findFirst({ where: { id: stationId, maquis_id } })
  if (!station) throw new Error('Station introuvable')
  return prisma.station.update({
    where: { id: stationId },
    data: { nom: data.nom, couleur: data.couleur, actif: data.actif }
  })
}

const supprimerStation = async (prisma, maquis_id, stationId) => {
  const station = await prisma.station.findFirst({ where: { id: stationId, maquis_id } })
  if (!station) throw new Error('Station introuvable')
  await prisma.station.update({ where: { id: stationId }, data: { actif: false } })
  return { message: 'Station désactivée' }
}

// ── Tables ───────────────────────────────────────────────────

const getTables = async (prisma, maquis_id) => {
  return prisma.tableEtablissement.findMany({
    where: { maquis_id, actif: true },
    include: {
      commandes: {
        where: { statut: { in: STATUTS_OUVERTS } },
        orderBy: { created_at: 'desc' },
        take: 1,
        include: { lignes: true }
      }
    },
    orderBy: { numero: 'asc' }
  })
}

const creerTable = async (prisma, maquis_id, data) => {
  const { numero, nom, capacite } = data
  if (!numero) throw new Error('Le numéro de table est requis')
  const existe = await prisma.tableEtablissement.findUnique({
    where: { maquis_id_numero: { maquis_id, numero } }
  })
  if (existe) throw new Error(`La table numéro ${numero} existe déjà`)
  return prisma.tableEtablissement.create({
    data: { maquis_id, numero, nom: nom || null, capacite: capacite || null }
  })
}

const modifierTable = async (prisma, maquis_id, tableId, data) => {
  const table = await prisma.tableEtablissement.findFirst({ where: { id: tableId, maquis_id } })
  if (!table) throw new Error('Table introuvable')
  return prisma.tableEtablissement.update({
    where: { id: tableId },
    data: { nom: data.nom, capacite: data.capacite, actif: data.actif, numero: data.numero }
  })
}

const supprimerTable = async (prisma, maquis_id, tableId) => {
  const table = await prisma.tableEtablissement.findFirst({ where: { id: tableId, maquis_id } })
  if (!table) throw new Error('Table introuvable')
  await prisma.tableEtablissement.update({ where: { id: tableId }, data: { actif: false } })
  return { message: 'Table désactivée' }
}

// ── Commandes ────────────────────────────────────────────────

const getCommandes = async (prisma, maquis_id, filtres = {}) => {
  const { statut, table_id, station_id, caisse_id, serveur_id, historique, date_debut, date_fin } = filtres
  const where = { maquis_id }
  if (statut) where.statut = statut
  else if (!historique) where.statut = { in: STATUTS_OUVERTS }
  if (table_id)   where.table_id   = parseInt(table_id)
  if (station_id) where.lignes     = { some: { station_id: parseInt(station_id) } }
  if (caisse_id)  where.caisse_id  = parseInt(caisse_id)
  if (serveur_id) where.serveur_id = parseInt(serveur_id)
  if (date_debut || date_fin) {
    where.created_at = {}
    if (date_debut) where.created_at.gte = new Date(date_debut)
    if (date_fin) {
      const fin = new Date(date_fin); fin.setHours(23, 59, 59, 999)
      where.created_at.lte = fin
    }
  }

  return prisma.commande.findMany({
    where,
    include: {
      table: true,
      serveur: { select: { id: true, nom: true } },
      caisse:  { select: { id: true, nom: true, couleur: true } },
      lignes: {
        include: {
          produit: { select: { id: true, nom: true, unite: true } },
          station: { select: { id: true, nom: true, couleur: true } }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  })
}

const getCommandesKDS = async (prisma, maquis_id, station_id) => {
  const filtreStation = station_id ? { station_id: parseInt(station_id) } : {}

  const where = {
    maquis_id,
    statut: { in: ['en_cours', 'ouverte', 'prete'] },
    lignes: {
      some: {
        statut: { in: ['en_attente', 'en_preparation'] },
        ...filtreStation
      }
    }
  }

  return prisma.commande.findMany({
    where,
    include: {
      table: true,
      serveur: { select: { id: true, nom: true } },
      lignes: {
        where: {
          statut: { in: ['en_attente', 'en_preparation'] },
          ...filtreStation
        },
        include: {
          produit: { select: { id: true, nom: true, unite: true } },
          station: { select: { id: true, nom: true, couleur: true } }
        }
      }
    },
    orderBy: { created_at: 'asc' }
  })
}

const getCommande = async (prisma, maquis_id, commandeId) => {
  return verifierAppartenance(prisma, maquis_id, commandeId)
}

const creerCommande = async (prisma, io, data, utilisateur) => {
  const { table_id, type_commande, lignes, note, direct, caisse_id } = data
  if (!lignes || lignes.length === 0) throw new Error('Une commande doit contenir au moins un article')

  await verifierModule(prisma, utilisateur.maquis_id)

  // Numéro auto : max global + 1 (contrainte unique maquis_id+numero)
  const derniere = await prisma.commande.findFirst({
    where: { maquis_id: utilisateur.maquis_id },
    orderBy: { numero: 'desc' }
  })
  const numero = (derniere?.numero || 0) + 1

  // Prépare les lignes avec station du produit par défaut
  const lignesPreparees = await Promise.all(lignes.map(async (l) => {
    const produit = await prisma.produit.findFirst({
      where: { id: l.produit_id, maquis_id: utilisateur.maquis_id, actif: true }
    })
    if (!produit) throw new Error(`Produit introuvable : ID ${l.produit_id}`)
    return {
      produit_id:    l.produit_id,
      station_id:    l.station_id || produit.station_id || null,
      quantite:      parseFloat(l.quantite) || 1,
      prix_unitaire: parseFloat(produit.prix_vente),
      note:          l.note || null,
      statut:        direct ? 'prete' : 'en_attente'
    }
  }))

  const commande = await prisma.commande.create({
    data: {
      maquis_id:     utilisateur.maquis_id,
      table_id:      table_id || null,
      serveur_id:    utilisateur.id,
      type_commande: type_commande || 'sur_place',
      statut:        direct ? 'en_attente' : 'en_cours',
      caisse_id:     caisse_id ? parseInt(caisse_id) : null,
      numero,
      note:          note || null,
      lignes: { create: lignesPreparees }
    },
    include: {
      table: true,
      serveur:  { select: { id: true, nom: true } },
      lignes: {
        include: {
          produit: { select: { id: true, nom: true, unite: true } },
          station: { select: { id: true, nom: true, couleur: true } }
        }
      }
    }
  })

  // Met la table à "occupee"
  if (table_id) {
    await prisma.tableEtablissement.update({
      where: { id: table_id },
      data: { statut: 'occupee' }
    })
  }

  // Notifie le KDS et la tablette
  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:nouvelle', commande)

  return commande
}

const ajouterLignes = async (prisma, io, commandeId, lignes, utilisateur, direct = false, caisse_id = null) => {
  if (!lignes || lignes.length === 0) throw new Error('Aucun article à ajouter')
  const commande = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)

  if (['encaissee', 'annulee'].includes(commande.statut)) {
    throw new Error('Impossible d\'ajouter des articles à une commande terminée')
  }

  const lignesPreparees = await Promise.all(lignes.map(async (l) => {
    const produit = await prisma.produit.findFirst({
      where: { id: l.produit_id, maquis_id: utilisateur.maquis_id, actif: true }
    })
    if (!produit) throw new Error(`Produit introuvable : ID ${l.produit_id}`)
    return {
      commande_id:   commandeId,
      produit_id:    l.produit_id,
      station_id:    l.station_id || produit.station_id || null,
      quantite:      parseFloat(l.quantite) || 1,
      prix_unitaire: parseFloat(produit.prix_vente),
      note:          l.note || null,
      statut:        direct ? 'prete' : 'en_attente'
    }
  }))

  await prisma.commandeLigne.createMany({ data: lignesPreparees })

  // Si envoi direct, passer la commande en_attente (caisse) et assigner la caisse cible
  if (direct && !['en_attente', 'prete', 'encaissee'].includes(commande.statut)) {
    await prisma.commande.update({
      where: { id: commandeId },
      data: {
        statut:    'en_attente',
        caisse_id: caisse_id ? parseInt(caisse_id) : commande.caisse_id
      }
    })
  }

  const commandeMaj = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:mise_a_jour', commandeMaj)
  return commandeMaj
}

const definirTemps = async (prisma, io, commandeId, minutes, utilisateur) => {
  if (!minutes || isNaN(parseInt(minutes)) || parseInt(minutes) < 1) {
    throw new Error('Durée invalide')
  }
  const commande = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  const commandeMaj = await prisma.commande.update({
    where: { id: commandeId },
    data: { temps_preparation: parseInt(minutes) },
    include: {
      table: true,
      serveur: { select: { id: true, nom: true } },
      lignes: {
        include: {
          produit: { select: { id: true, nom: true, unite: true } },
          station: { select: { id: true, nom: true, couleur: true } }
        }
      }
    }
  })
  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:mise_a_jour', commandeMaj)
  return commandeMaj
}

const changerStatutLigne = async (prisma, io, ligneId, statut, utilisateur) => {
  const statutsValides = ['en_attente', 'en_preparation', 'prete', 'servie', 'annulee']
  if (!statutsValides.includes(statut)) throw new Error('Statut invalide')

  const ligne = await prisma.commandeLigne.findFirst({
    where: { id: ligneId },
    include: { commande: true }
  })
  if (!ligne || ligne.commande.maquis_id !== utilisateur.maquis_id) {
    throw new Error('Ligne introuvable')
  }
  if (ligne.statut === 'annulee' && ligne.commande.statut !== 'ouverte') {
    throw new Error('Impossible de modifier une ligne annulée')
  }

  await prisma.commandeLigne.update({ where: { id: ligneId }, data: { statut } })

  // Si toutes les lignes actives sont "prete" → commande passe à "prete"
  const lignesActives = await prisma.commandeLigne.findMany({
    where: { commande_id: ligne.commande_id, statut: { not: 'annulee' } }
  })
  const toutPret = lignesActives.every(l => l.id === ligneId ? statut === 'prete' : l.statut === 'prete')
  if (toutPret && lignesActives.length > 0) {
    await prisma.commande.update({ where: { id: ligne.commande_id }, data: { statut: 'prete' } })
  }

  const commandeMaj = await verifierAppartenance(prisma, utilisateur.maquis_id, ligne.commande_id)
  io.to(`maquis_${utilisateur.maquis_id}`).emit('kds:mise_a_jour', commandeMaj)
  return commandeMaj
}

const changerStatutCommande = async (prisma, io, commandeId, statut, utilisateur) => {
  const statutsValides = ['ouverte', 'en_cours', 'prete', 'servie']
  if (!statutsValides.includes(statut)) throw new Error('Statut invalide (utiliser /annuler pour annuler)')

  const commande = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  if (['encaissee', 'annulee'].includes(commande.statut)) {
    throw new Error('Impossible de modifier une commande terminée')
  }

  const commandeMaj = await prisma.commande.update({
    where: { id: commandeId },
    data: { statut },
    include: { table: true }
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:mise_a_jour', commandeMaj)
  return commandeMaj
}

const annulerCommande = async (prisma, io, commandeId, motif, utilisateur) => {
  if (!motif || !motif.trim()) throw new Error('Le motif d\'annulation est obligatoire')

  const commande = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  if (commande.statut === 'annulee')   throw new Error('Commande déjà annulée')
  if (commande.statut === 'encaissee') throw new Error('Impossible d\'annuler une commande déjà encaissée')

  await prisma.commande.update({
    where: { id: commandeId },
    data: {
      statut:           'annulee',
      annulation_motif: motif.trim(),
      annule_par:       utilisateur.id
    }
  })

  // Libère la table
  if (commande.table_id) {
    const autresCommandes = await prisma.commande.count({
      where: { table_id: commande.table_id, statut: { in: STATUTS_OUVERTS }, id: { not: commandeId } }
    })
    if (autresCommandes === 0) {
      await prisma.tableEtablissement.update({ where: { id: commande.table_id }, data: { statut: 'libre' } })
    }
  }

  const commandeMaj = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:annulee', { commande_id: commandeId, motif, annule_par: utilisateur.nom })
  return commandeMaj
}

const encaisserCommande = async (prisma, io, commandeId, data, utilisateur) => {
  const { mode_paiement, note_vente } = data
  const modesValides = ['especes', 'wave', 'orange_money', 'mtn_money', 'credit', 'autre']
  if (!modesValides.includes(mode_paiement)) throw new Error('Mode de paiement invalide')

  const commande = await verifierAppartenance(prisma, utilisateur.maquis_id, commandeId)
  if (commande.statut === 'encaissee') throw new Error('Commande déjà encaissée')
  if (commande.statut === 'annulee')  throw new Error('Impossible d\'encaisser une commande annulée')

  const lignesActives = commande.lignes.filter(l => l.statut !== 'annulee')
  if (lignesActives.length === 0) throw new Error('Aucun article actif dans cette commande')

  const vente = await prisma.$transaction(async (tx) => {
    const total = lignesActives.reduce((s, l) => s + parseFloat(l.prix_unitaire) * parseFloat(l.quantite), 0)

    // Crée la vente liée à la commande
    const nouvelleVente = await tx.vente.create({
      data: {
        maquis_id:     utilisateur.maquis_id,
        caissier_id:   utilisateur.id,
        total_brut:    parseFloat(total.toFixed(2)),
        remise_globale: 0,
        total_net:     parseFloat(total.toFixed(2)),
        mode_paiement,
        statut:        mode_paiement === 'credit' ? 'credit_en_cours' : 'encaissee',
        note:          note_vente || commande.note || null,
        commande_id:   commandeId,
        serveur_nom:   commande.serveur?.nom || null,
        lignes: {
          create: lignesActives.map(l => ({
            produit_id:    l.produit_id,
            quantite:      l.quantite,
            prix_unitaire: l.prix_unitaire,
            prix_catalogue: l.prix_unitaire,
            economie_client: 0,
            remise_ligne:  0,
            total_ligne:   parseFloat((parseFloat(l.prix_unitaire) * parseFloat(l.quantite)).toFixed(2))
          }))
        }
      }
    })

    // Décrémente le stock + crée les mouvements
    for (const ligne of lignesActives) {
      await tx.produit.update({
        where: { id: ligne.produit_id },
        data: { stock_actuel: { decrement: ligne.quantite } }
      })
      await tx.stockMouvement.create({
        data: {
          maquis_id:      utilisateur.maquis_id,
          produit_id:     ligne.produit_id,
          type_mouvement: 'sortie_vente',
          quantite:       ligne.quantite,
          raison:         `Commande #${commande.numero} → Vente #${nouvelleVente.id}`,
          utilisateur_id: utilisateur.id
        }
      })
    }

    // Clôture la commande
    await tx.commande.update({ where: { id: commandeId }, data: { statut: 'encaissee' } })

    // Libère la table
    if (commande.table_id) {
      await tx.tableEtablissement.update({
        where: { id: commande.table_id },
        data: { statut: 'libre' }
      })
    }

    return nouvelleVente
  })

  io.to(`maquis_${utilisateur.maquis_id}`).emit('commande:encaissee', { commande_id: commandeId, vente_id: vente.id })
  io.to(`maquis_${utilisateur.maquis_id}`).emit('dashboard:update', { type: 'nouvelle_vente', vente_id: vente.id })

  return vente
}

module.exports = {
  getStations, creerStation, modifierStation, supprimerStation,
  getTables, creerTable, modifierTable, supprimerTable,
  getCommandes, getCommandesKDS, getCommande,
  creerCommande, ajouterLignes, definirTemps,
  changerStatutLigne, changerStatutCommande, annulerCommande, encaisserCommande
}
