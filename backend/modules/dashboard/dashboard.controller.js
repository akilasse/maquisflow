// ============================================================
// DASHBOARD CONTROLLER - Reçoit les requêtes HTTP
// Appelle le service et formate les réponses JSON
// ============================================================

const dashboardService = require('./dashboard.service')

// GET /api/dashboard
// Données du dashboard - patron et gérant uniquement
const getDashboard = async (req, res) => {
  try {
    const data = await dashboardService.getDashboard(
      req.prisma,
      req.utilisateur,
      req.query
    )

    return res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

module.exports = { getDashboard }