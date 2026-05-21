const svc = require('./commandes.service')

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data })
const err = (res, error, status = 400) => res.status(status).json({ success: false, message: error.message })

// ── Stations ─────────────────────────────────────────────────

const getStations = async (req, res) => {
  try { ok(res, await svc.getStations(req.prisma, req.utilisateur.maquis_id)) }
  catch (e) { err(res, e) }
}

const creerStation = async (req, res) => {
  try { ok(res, await svc.creerStation(req.prisma, req.utilisateur.maquis_id, req.body), 201) }
  catch (e) { err(res, e) }
}

const modifierStation = async (req, res) => {
  try { ok(res, await svc.modifierStation(req.prisma, req.utilisateur.maquis_id, parseInt(req.params.id), req.body)) }
  catch (e) { err(res, e) }
}

const supprimerStation = async (req, res) => {
  try { ok(res, await svc.supprimerStation(req.prisma, req.utilisateur.maquis_id, parseInt(req.params.id))) }
  catch (e) { err(res, e) }
}

// ── Tables ───────────────────────────────────────────────────

const getTables = async (req, res) => {
  try { ok(res, await svc.getTables(req.prisma, req.utilisateur.maquis_id)) }
  catch (e) { err(res, e) }
}

const creerTable = async (req, res) => {
  try { ok(res, await svc.creerTable(req.prisma, req.utilisateur.maquis_id, req.body), 201) }
  catch (e) { err(res, e) }
}

const modifierTable = async (req, res) => {
  try { ok(res, await svc.modifierTable(req.prisma, req.utilisateur.maquis_id, parseInt(req.params.id), req.body)) }
  catch (e) { err(res, e) }
}

const supprimerTable = async (req, res) => {
  try { ok(res, await svc.supprimerTable(req.prisma, req.utilisateur.maquis_id, parseInt(req.params.id))) }
  catch (e) { err(res, e) }
}

// ── Commandes ────────────────────────────────────────────────

const getCommandes = async (req, res) => {
  try { ok(res, await svc.getCommandes(req.prisma, req.utilisateur.maquis_id, req.query)) }
  catch (e) { err(res, e) }
}

const getCommandesKDS = async (req, res) => {
  try { ok(res, await svc.getCommandesKDS(req.prisma, req.utilisateur.maquis_id, req.query.station_id)) }
  catch (e) { err(res, e) }
}

const getCommande = async (req, res) => {
  try { ok(res, await svc.getCommande(req.prisma, req.utilisateur.maquis_id, parseInt(req.params.id))) }
  catch (e) { err(res, e) }
}

const creerCommande = async (req, res) => {
  try { ok(res, await svc.creerCommande(req.prisma, req.io, req.body, req.utilisateur), 201) }
  catch (e) { err(res, e) }
}

const ajouterLignes = async (req, res) => {
  try { ok(res, await svc.ajouterLignes(req.prisma, req.io, parseInt(req.params.id), req.body.lignes, req.utilisateur, req.body.direct === true, req.body.caisse_id || null)) }
  catch (e) { err(res, e) }
}

const definirTemps = async (req, res) => {
  try { ok(res, await svc.definirTemps(req.prisma, req.io, parseInt(req.params.id), req.body.minutes, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const changerStatutLigne = async (req, res) => {
  try { ok(res, await svc.changerStatutLigne(req.prisma, req.io, parseInt(req.params.id), req.body.statut, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const changerStatutCommande = async (req, res) => {
  try { ok(res, await svc.changerStatutCommande(req.prisma, req.io, parseInt(req.params.id), req.body.statut, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const modifierLignesCommande = async (req, res) => {
  try { ok(res, await svc.modifierLignesCommande(req.prisma, req.io, parseInt(req.params.id), req.body.lignes, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const appliquerReductionCommande = async (req, res) => {
  try { ok(res, await svc.appliquerReductionCommande(req.prisma, req.io, parseInt(req.params.id), req.body, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const annulerCommande = async (req, res) => {
  try { ok(res, await svc.annulerCommande(req.prisma, req.io, parseInt(req.params.id), req.body.motif, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const encaisserCommande = async (req, res) => {
  try { ok(res, await svc.encaisserCommande(req.prisma, req.io, parseInt(req.params.id), req.body, req.utilisateur)) }
  catch (e) { err(res, e) }
}

const reimprimer = async (req, res) => {
  try {
    const maquis_id = req.utilisateur.maquis_id
    const commandeId = parseInt(req.params.id)
    // Récupère la commande complète
    const commande = await req.prisma.commande.findFirst({
      where: { id: commandeId, maquis_id },
      include: {
        lignes: { include: { produit: true } },
        table:  true,
        serveur: { select: { nom: true } }
      }
    })
    if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable' })
    // Récupère le maquis pour logo/adresse/téléphone
    const maquis = await req.prisma.maquis.findUnique({ where: { id: maquis_id } })
    // Émet commande:reimprimer → l'Electron caisse connecté imprime le bon
    req.io.to(`maquis_${maquis_id}`).emit('commande:reimprimer', {
      numero:         commande.numero,
      numero_journee: commande.numero_journee || null,
      maquis:         maquis?.nom || 'Flowix',
      logo_url:       maquis?.logo_url || null,
      adresse:        maquis?.adresse || null,
      telephone:      maquis?.telephone || null,
      table:          commande.table?.numero || null,
      serveur:        commande.serveur?.nom || '',
      date:           new Date(commande.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      lignes:         commande.lignes.map(l => ({
        nom:           l.produit?.nom || '?',
        variante_nom:  l.variante_nom || null,
        quantite:      parseFloat(l.quantite),
        prix_unitaire: parseFloat(l.prix_unitaire || 0),
        total:         parseFloat(l.prix_unitaire || 0) * parseFloat(l.quantite || 1),
        note:          l.note || ''
      })),
      note: commande.note || null
    })
    res.json({ success: true, message: 'Bon envoyé à l\'imprimante' })
  } catch (e) { err(res, e) }
}

module.exports = {
  getStations, creerStation, modifierStation, supprimerStation,
  getTables, creerTable, modifierTable, supprimerTable,
  getCommandes, getCommandesKDS, getCommande,
  creerCommande, ajouterLignes, definirTemps,
  changerStatutLigne, changerStatutCommande, modifierLignesCommande,
  appliquerReductionCommande, annulerCommande, encaisserCommande, reimprimer
}
