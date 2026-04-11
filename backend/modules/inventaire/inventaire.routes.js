// ============================================================
// INVENTAIRE ROUTES - URLs du module Inventaire
// Toutes les routes sont protégées par le middleware auth
// ============================================================

const express = require('express')
const router = express.Router()
const inventaireController = require('./inventaire.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

// POST /api/inventaire
// Démarre un inventaire - gérant et patron uniquement
router.post(
  '/',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  inventaireController.creerInventaire
)

// PUT /api/inventaire/:id/ligne
// Met à jour une ligne - gérant et patron uniquement
router.put(
  '/:id/ligne',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  inventaireController.mettreAJourLigne
)

// POST /api/inventaire/:id/cloturer
// Clôture un inventaire - gérant et patron uniquement
router.post(
  '/:id/cloturer',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  inventaireController.cloturerInventaire
)

// GET /api/inventaire
// Liste des inventaires - tous les rôles
router.get(
  '/',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  inventaireController.getInventaires
)

// GET /api/inventaire/:id
// Détail d'un inventaire - tous les rôles
router.get(
  '/:id',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  inventaireController.getInventaire
)

module.exports = router