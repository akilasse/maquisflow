// ============================================================
// STOCK ROUTES - URLs du module Stock
// Toutes les routes sont protégées par le middleware auth
// ============================================================

const express = require('express')
const router = express.Router()
const stockController = require('./stock.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')
const bonController = require('./bon.controller')

// POST /api/stock/entree
// Entrée de stock - gérant et patron uniquement
router.post(
  '/entree',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  stockController.entreeStock
)

// POST /api/stock/sortie
// Sortie manuelle - gérant et patron uniquement
router.post(
  '/sortie',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  stockController.sortieStock
)

// GET /api/stock/historique
// Historique mouvements - tous les rôles
router.get(
  '/historique',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  stockController.getHistorique
)

// GET /api/stock/produits
// Liste produits avec stocks - tous les rôles
router.get(
  '/produits',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  stockController.getProduits
)

// POST /api/stock/bons - Créer un bon d'approvisionnement
router.post(
  '/bons',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  bonController.creerBon
)

// GET /api/stock/bons - Liste des bons
router.get(
  '/bons',
  verifierToken,
  autoriserRoles('gerant', 'patron'),
  bonController.getBons
)


module.exports = router