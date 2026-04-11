// ============================================================
// BON D'APPROVISIONNEMENT CONTROLLER
// ============================================================

const bonService = require('./bon.service')

// POST /api/stock/bons
const creerBon = async (req, res) => {
  try {
    const bon = await bonService.creerBon(
      req.prisma,
      req.io,
      req.body,
      req.utilisateur
    )
    return res.status(201).json({
      success: true,
      message: 'Bon d\'approvisionnement créé avec succès',
      data: bon
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// GET /api/stock/bons
const getBons = async (req, res) => {
  try {
    const bons = await bonService.getBons(
      req.prisma,
      req.utilisateur.maquis_id
    )
    return res.status(200).json({
      success: true,
      data: bons
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

module.exports = { creerBon, getBons }