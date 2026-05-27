const inventaireService = require('./inventaire.service')

const creerInventaire = async (req, res) => {
  try {
    const inventaire = await inventaireService.creerInventaire(req.prisma, req.utilisateur)
    return res.status(201).json({ success: true, message: 'Inventaire démarré avec succès', data: inventaire })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const mettreAJourLigne = async (req, res) => {
  try {
    const { id } = req.params
    const { produit_id, qte_base, variantes_comptees, qte_reelle } = req.body
    if (!produit_id) {
      return res.status(400).json({ success: false, message: 'produit_id requis' })
    }
    // Compatibilité : si qte_base absent, utiliser qte_reelle (ancienne API)
    const base = qte_base !== undefined ? qte_base : qte_reelle
    if (base === undefined) {
      return res.status(400).json({ success: false, message: 'qte_base requis' })
    }
    const ligne = await inventaireService.mettreAJourLigne(
      req.prisma, parseInt(id), parseInt(produit_id),
      parseFloat(base), variantes_comptees || [], req.utilisateur
    )
    return res.status(200).json({ success: true, message: 'Ligne mise à jour', data: ligne })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const cloturerInventaire = async (req, res) => {
  try {
    const { id } = req.params
    const inventaire = await inventaireService.cloturerInventaire(req.prisma, req.io, parseInt(id), req.utilisateur)
    return res.status(200).json({ success: true, message: 'Inventaire clôturé avec succès', data: inventaire })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const annulerInventaire = async (req, res) => {
  try {
    const { id } = req.params
    const { motif } = req.body || {}
    await inventaireService.annulerInventaire(req.prisma, parseInt(id), req.utilisateur, motif)
    return res.status(200).json({ success: true, message: 'Inventaire annulé avec succès' })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const getInventaire = async (req, res) => {
  try {
    const { id } = req.params
    const inventaire = await inventaireService.getInventaire(req.prisma, parseInt(id), req.utilisateur.maquis_id)
    return res.status(200).json({ success: true, data: inventaire })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const getInventaires = async (req, res) => {
  try {
    const inventaires = await inventaireService.getInventaires(req.prisma, req.utilisateur.maquis_id)
    return res.status(200).json({ success: true, data: inventaires })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = { creerInventaire, mettreAJourLigne, cloturerInventaire, annulerInventaire, getInventaire, getInventaires }