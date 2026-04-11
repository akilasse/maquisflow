// ============================================================
// INVENTAIRE CONTROLLER - Reçoit les requêtes HTTP
// Appelle le service et formate les réponses JSON
// ============================================================

const inventaireService = require('./inventaire.service')

// POST /api/inventaire
// Démarre un nouvel inventaire
const creerInventaire = async (req, res) => {
  try {
    const inventaire = await inventaireService.creerInventaire(
      req.prisma,
      req.utilisateur
    )
    return res.status(201).json({
      success: true,
      message: 'Inventaire démarré avec succès',
      data: inventaire
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// PUT /api/inventaire/:id/ligne
// Met à jour une ligne d'inventaire
const mettreAJourLigne = async (req, res) => {
  try {
    const { id } = req.params
    const { produit_id, qte_reelle } = req.body

    if (!produit_id || qte_reelle === undefined) {
      return res.status(400).json({
        success: false,
        message: 'produit_id et qte_reelle requis'
      })
    }

    const ligne = await inventaireService.mettreAJourLigne(
      req.prisma,
      parseInt(id),
      parseInt(produit_id),
      parseFloat(qte_reelle),
      req.utilisateur
    )

    return res.status(200).json({
      success: true,
      message: 'Ligne mise à jour',
      data: ligne
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// POST /api/inventaire/:id/cloturer
// Clôture un inventaire
const cloturerInventaire = async (req, res) => {
  try {
    const { id } = req.params

    const inventaire = await inventaireService.cloturerInventaire(
      req.prisma,
      req.io,
      parseInt(id),
      req.utilisateur
    )

    return res.status(200).json({
      success: true,
      message: 'Inventaire clôturé avec succès',
      data: inventaire
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// GET /api/inventaire/:id
// Récupère un inventaire
const getInventaire = async (req, res) => {
  try {
    const { id } = req.params

    const inventaire = await inventaireService.getInventaire(
      req.prisma,
      parseInt(id),
      req.utilisateur.maquis_id
    )

    return res.status(200).json({
      success: true,
      data: inventaire
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// GET /api/inventaire
// Liste des inventaires
const getInventaires = async (req, res) => {
  try {
    const inventaires = await inventaireService.getInventaires(
      req.prisma,
      req.utilisateur.maquis_id
    )

    return res.status(200).json({
      success: true,
      data: inventaires
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

module.exports = {
  creerInventaire,
  mettreAJourLigne,
  cloturerInventaire,
  getInventaire,
  getInventaires
}