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

module.exports = {
  creerVente,
  getVentes
}