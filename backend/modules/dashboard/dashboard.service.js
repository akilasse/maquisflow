// ============================================================
// DASHBOARD SERVICE - Données temps réel pour le patron
// Marge visible uniquement pour le rôle patron
// ============================================================

const getDashboard = async (prisma, utilisateur, filtres = {}) => {
  const { date_debut, date_fin, graphique = 'semaine' } = filtres

  const maquis_id = utilisateur.maquis_id
  const now = new Date()

  // ── Période filtre manuel (optionnel) ──
  const debut = date_debut ? new Date(date_debut) : new Date(new Date().setHours(0, 0, 0, 0))
  const fin   = date_fin   ? new Date(date_fin)   : new Date(new Date().setHours(23, 59, 59, 999))

  // ── Période jour ──
  const debutJour = new Date(now); debutJour.setHours(0, 0, 0, 0)
  const finJour   = new Date(now); finJour.setHours(23, 59, 59, 999)

  // ── Période semaine : lundi de la semaine en cours ──
  const debutSemaine = new Date(now)
  const jourSemaine  = debutSemaine.getDay() === 0 ? 6 : debutSemaine.getDay() - 1
  debutSemaine.setDate(debutSemaine.getDate() - jourSemaine)
  debutSemaine.setHours(0, 0, 0, 0)

  // ── Période mois : 1er du mois en cours ──
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

  // ── Requêtes en parallèle ──
  const [
    aggrJour,
    aggrSemaine,
    aggrMois,
    margeJourRaw,
    margeSemaineRaw,
    margeMoisRaw,
    ventesGraphique,
    ventesParMode,
    stocksCritiques,
    topProduits,
    maquis
  ] = await Promise.all([

    // 1 — Agrégat jour
    prisma.vente.aggregate({
      where: { maquis_id, date_vente: { gte: debutJour, lte: finJour }, statut: { in: ['encaissee', 'credit_en_cours'] } },
      _sum: { total_net: true },
      _count: { id: true },
      _avg: { total_net: true }
    }),

    // 2 — Agrégat semaine (lundi → maintenant)
    prisma.vente.aggregate({
      where: { maquis_id, date_vente: { gte: debutSemaine, lte: now }, statut: { in: ['encaissee', 'credit_en_cours'] } },
      _sum: { total_net: true },
      _count: { id: true }
    }),

    // 3 — Agrégat mois (1er → maintenant)
    prisma.vente.aggregate({
      where: { maquis_id, date_vente: { gte: debutMois, lte: now }, statut: { in: ['encaissee', 'credit_en_cours'] } },
      _sum: { total_net: true },
      _count: { id: true }
    }),

    // 4 — Bénéfice jour
    prisma.$queryRaw`
      SELECT SUM((vl.prix_unitaire - p.prix_achat) * vl.quantite) AS benefice
      FROM VenteLigne vl
      JOIN Produit p ON p.id = vl.produit_id
      JOIN Vente v   ON v.id = vl.vente_id
      WHERE v.maquis_id = ${maquis_id}
        AND v.date_vente >= ${debutJour}
        AND v.date_vente <= ${finJour}
        AND v.statut IN ('encaissee', 'credit_en_cours')
    `,

    // 5 — Bénéfice semaine
    prisma.$queryRaw`
      SELECT SUM((vl.prix_unitaire - p.prix_achat) * vl.quantite) AS benefice
      FROM VenteLigne vl
      JOIN Produit p ON p.id = vl.produit_id
      JOIN Vente v   ON v.id = vl.vente_id
      WHERE v.maquis_id = ${maquis_id}
        AND v.date_vente >= ${debutSemaine}
        AND v.date_vente <= ${now}
        AND v.statut IN ('encaissee', 'credit_en_cours')
    `,

    // 6 — Bénéfice mois
    prisma.$queryRaw`
      SELECT SUM((vl.prix_unitaire - p.prix_achat) * vl.quantite) AS benefice
      FROM VenteLigne vl
      JOIN Produit p ON p.id = vl.produit_id
      JOIN Vente v   ON v.id = vl.vente_id
      WHERE v.maquis_id = ${maquis_id}
        AND v.date_vente >= ${debutMois}
        AND v.date_vente <= ${now}
        AND v.statut IN ('encaissee', 'credit_en_cours')
    `,

    // 7 — Graphique : par jour (semaine) ou par mois (année)
    graphique === 'mois'
      ? prisma.$queryRaw`
          SELECT
            MONTH(date_vente) AS periode,
            YEAR(date_vente)  AS annee,
            COUNT(id)         AS nombre_ventes,
            SUM(total_net)    AS ca
          FROM Vente
          WHERE maquis_id = ${maquis_id}
            AND date_vente >= ${new Date(now.getFullYear(), 0, 1)}
            AND date_vente <= ${now}
            AND statut IN ('encaissee', 'credit_en_cours')
          GROUP BY YEAR(date_vente), MONTH(date_vente)
          ORDER BY annee ASC, periode ASC
        `
      : prisma.$queryRaw`
          SELECT
            DATE(date_vente)  AS periode,
            COUNT(id)         AS nombre_ventes,
            SUM(total_net)    AS ca
          FROM Vente
          WHERE maquis_id = ${maquis_id}
            AND date_vente >= ${debutSemaine}
            AND date_vente <= ${now}
            AND statut IN ('encaissee', 'credit_en_cours')
          GROUP BY DATE(date_vente)
          ORDER BY periode ASC
        `,

    // 8 — Répartition par mode de paiement (jour)
    prisma.vente.groupBy({
      by: ['mode_paiement'],
      where: { maquis_id, date_vente: { gte: debutJour, lte: finJour }, statut: { in: ['encaissee', 'credit_en_cours'] } },
      _sum: { total_net: true },
      _count: { id: true }
    }),

    // 9 — Stocks critiques
    prisma.$queryRaw`
      SELECT id, nom, stock_actuel, stock_min, unite
      FROM Produit
      WHERE maquis_id = ${maquis_id}
        AND actif = true
        AND stock_actuel <= stock_min
    `,

    // 10 — Top 5 produits du jour
    prisma.$queryRaw`
      SELECT
        p.id,
        p.nom,
        p.unite,
        p.prix_vente,
        p.prix_achat,
        SUM(vl.quantite)    AS total_vendu,
        SUM(vl.total_ligne) AS ca_produit
      FROM VenteLigne vl
      JOIN Produit p ON p.id = vl.produit_id
      JOIN Vente v   ON v.id = vl.vente_id
      WHERE v.maquis_id = ${maquis_id}
        AND v.date_vente >= ${debutJour}
        AND v.date_vente <= ${finJour}
        AND v.statut IN ('encaissee', 'credit_en_cours')
      GROUP BY p.id, p.nom, p.unite, p.prix_vente, p.prix_achat
      ORDER BY total_vendu DESC
      LIMIT 5
    `,

    // 11 — Infos maquis
    prisma.maquis.findUnique({
      where: { id: maquis_id },
      select: { nom: true, logo_url: true, couleur_primaire: true, devise: true }
    })
  ])

  // ── Calculs ──
  const venteJour     = parseFloat(aggrJour._sum.total_net    || 0)
  const venteSemaine  = parseFloat(aggrSemaine._sum.total_net || 0)
  const venteMois     = parseFloat(aggrMois._sum.total_net    || 0)
  const nbJour        = aggrJour._count.id    || 0
  const nbSemaine     = aggrSemaine._count.id || 0
  const nbMois        = aggrMois._count.id    || 0
  const panierMoyen   = parseFloat(aggrJour._avg.total_net    || 0)

  const beneficeJour    = parseFloat(margeJourRaw[0]?.benefice    || 0)
  const beneficeSemaine = parseFloat(margeSemaineRaw[0]?.benefice || 0)
  const beneficeMois    = parseFloat(margeMoisRaw[0]?.benefice    || 0)

  // ── Wallets (jour) ──
  const WALLETS_MODES = ['wave', 'orange_money', 'mtn_money']
  const wallets = {}
  WALLETS_MODES.forEach(mode => {
    const t = ventesParMode.find(v => v.mode_paiement === mode)
    wallets[mode] = t ? parseFloat(t._sum.total_net || 0) : 0
  })

  // ── Répartition paiements ──
  const repartition_paiement = ventesParMode.map(item => ({
    mode:   item.mode_paiement,
    total:  parseFloat(item._sum.total_net || 0),
    nombre: item._count.id
  }))

  // ── Top produits ──
  const top_produits = topProduits.map(p => {
    const prod = {
      id:          Number(p.id),
      nom:         p.nom,
      unite:       p.unite,
      total_vendu: Number(p.total_vendu),
      ca_produit:  parseFloat(p.ca_produit)
    }
    if (utilisateur.role === 'patron') {
      prod.marge = parseFloat(
        ((parseFloat(p.prix_vente) - parseFloat(p.prix_achat)) * Number(p.total_vendu)).toFixed(2)
      )
    }
    return prod
  })

  // ── Graphique ──
  const ventes_graphique = ventesGraphique.map(v => ({
    periode:       graphique === 'mois'
                     ? `${Number(v.annee)}-${String(Number(v.periode)).padStart(2, '0')}`
                     : v.periode,
    nombre_ventes: Number(v.nombre_ventes),
    ca:            parseFloat(v.ca)
  }))

  return {
    maquis,
    resume: {
      // Jour
      vente_jour:        venteJour,
      benefice_jour:     beneficeJour,
      nb_jour:           nbJour,
      panier_moyen:      panierMoyen,
      // Semaine (lundi → aujourd'hui)
      vente_semaine:     venteSemaine,
      benefice_semaine:  beneficeSemaine,
      nb_semaine:        nbSemaine,
      // Mois (1er → aujourd'hui)
      vente_mois:        venteMois,
      benefice_mois:     beneficeMois,
      nb_mois:           nbMois,
    },
    wallets,
    repartition_paiement,
    ventes_graphique,
    top_produits,
    stocks_critiques: stocksCritiques
  }
}

module.exports = { getDashboard }