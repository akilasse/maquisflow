// ============================================================
// STOCK CONTROLLER - Reçoit les requêtes HTTP
// Appelle le service et formate les réponses JSON
// ============================================================

const stockService = require('./stock.service')

// POST /api/stock/entree
const entreeStock = async (req, res) => {
  try {
    const resultat = await stockService.entreeStock(
      req.prisma,
      req.io,
      req.body,
      req.utilisateur
    )
    return res.status(201).json({
      success: true,
      message: 'Entrée de stock enregistrée',
      data: resultat
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// POST /api/stock/sortie
const sortieStock = async (req, res) => {
  try {
    const resultat = await stockService.sortieManuellStock(
      req.prisma,
      req.io,
      req.body,
      req.utilisateur
    )
    return res.status(201).json({
      success: true,
      message: 'Sortie de stock enregistrée',
      data: resultat
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// GET /api/stock/historique
const getHistorique = async (req, res) => {
  try {
    const resultat = await stockService.getHistorique(
      req.prisma,
      req.utilisateur.maquis_id,
      req.query
    )
    return res.status(200).json({
      success: true,
      data: resultat
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// GET /api/stock/produits
const getProduits = async (req, res) => {
  try {
    const produits = await stockService.getProduits(
      req.prisma,
      req.utilisateur.maquis_id
    )
    return res.status(200).json({
      success: true,
      data: produits
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getAlertes = async (req, res) => {
  try {
    // Récupère tous les produits actifs avec leur stock
    const produits = await req.prisma.produit.findMany({
      where: { maquis_id: req.utilisateur.maquis_id, actif: true },
      select: { id: true, nom: true, stock_actuel: true, stock_min: true, unite: true }
    })
    // Alerte si : stock à zéro/négatif (rupture) OU en-dessous du seuil configuré
    const alertes = produits.filter(p => {
      const actuel = parseFloat(p.stock_actuel)
      const min = parseFloat(p.stock_min)
      return actuel <= 0 || (min > 0 && actuel <= min)
    })
    res.json({ success: true, data: alertes })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

module.exports = {
  entreeStock,
  sortieStock,
  getHistorique,
  getProduits,
  getAlertes
}