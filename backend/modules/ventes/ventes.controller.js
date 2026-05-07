const ventesService = require('./ventes.service')

const creerVente = async (req, res) => {
  try {
    const vente = await ventesService.creerVente(
      req.prisma,
      req.io,
      req.body,
      req.utilisateur
    )
    return res.status(201).json({
      success: true,
      message: 'Vente enregistrée avec succès',
      data: vente
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getVentes = async (req, res) => {
  try {
    const ventes = await ventesService.getVentes(
      req.prisma,
      req.utilisateur.maquis_id,
      req.query
    )
    return res.status(200).json({
      success: true,
      data: ventes
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const retourEnAttente = async (req, res) => {
  try {
    const vente = await ventesService.retourEnAttente(req.prisma, parseInt(req.params.id), req.utilisateur)
    return res.json({ success: true, data: vente })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const appliquerReduction = async (req, res) => {
  try {
    const vente = await ventesService.appliquerReduction(req.prisma, req.io, parseInt(req.params.id), req.body, req.utilisateur)
    return res.json({ success: true, data: vente })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const annulerVente = async (req, res) => {
  try {
    const result = await ventesService.annulerVente(req.prisma, req.io, parseInt(req.params.id), req.body.motif, req.utilisateur)
    return res.json({ success: true, ...result })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

const reEncaisserVente = async (req, res) => {
  try {
    const vente = await ventesService.reEncaisserVente(req.prisma, req.io, parseInt(req.params.id), req.body.mode_paiement, req.utilisateur)
    return res.json({ success: true, data: vente })
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = {
  creerVente,
  getVentes,
  retourEnAttente,
  appliquerReduction,
  annulerVente,
  reEncaisserVente
}