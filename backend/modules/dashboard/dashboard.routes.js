// ============================================================
// DASHBOARD ROUTES - URLs du module Dashboard
// Accessible patron et gérant uniquement
// ============================================================

const express = require('express')
const router = express.Router()
const dashboardController = require('./dashboard.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

// GET /api/dashboard
// Dashboard temps réel - patron et gérant uniquement
router.get(
  '/',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  dashboardController.getDashboard
)

module.exports = router