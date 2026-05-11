const express = require('express')
const router = express.Router()
const ctrl = require('./commandes.controller')
const { verifierToken, autoriserRoles, requireMaquis } = require('../../middlewares/auth')

const tous  = [verifierToken, requireMaquis]
const staff = [verifierToken, requireMaquis, autoriserRoles('caissier', 'gerant', 'patron', 'serveur')]
const admin = [verifierToken, requireMaquis, autoriserRoles('gerant', 'patron')]

// ── Stations ────────────────────────────────────────────────
router.get('/stations',      tous,  ctrl.getStations)
router.post('/stations',     admin, ctrl.creerStation)
router.put('/stations/:id',  admin, ctrl.modifierStation)
router.delete('/stations/:id', admin, ctrl.supprimerStation)

// ── Tables ──────────────────────────────────────────────────
router.get('/tables',        tous,  ctrl.getTables)
router.post('/tables',       admin, ctrl.creerTable)
router.put('/tables/:id',    admin, ctrl.modifierTable)
router.delete('/tables/:id', admin, ctrl.supprimerTable)

// ── KDS (avant /:id pour éviter le conflit de route) ────────
router.get('/kds', tous, ctrl.getCommandesKDS)

// ── Commandes ───────────────────────────────────────────────
router.get('/',    tous,  ctrl.getCommandes)
router.post('/',   staff, ctrl.creerCommande)
router.get('/:id', tous,  ctrl.getCommande)

router.post('/:id/lignes',     staff, ctrl.ajouterLignes)
router.put('/:id/statut',      staff, ctrl.changerStatutCommande)
router.put('/:id/temps',       staff, ctrl.definirTemps)
router.put('/:id/annuler',     admin, ctrl.annulerCommande)
router.post('/:id/encaisser',  staff, ctrl.encaisserCommande)

router.put('/lignes/:id/statut', staff, ctrl.changerStatutLigne)

module.exports = router
