const express = require('express')
const router = express.Router()
const ventesController = require('./ventes.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

const staff = [verifierToken, autoriserRoles('caissier', 'gerant', 'patron')]
const admin = [verifierToken, autoriserRoles('gerant', 'patron')]

router.post('/', staff, ventesController.creerVente)
router.get('/',  staff, ventesController.getVentes)

router.put('/:id/retour-attente', admin, ventesController.retourEnAttente)
router.put('/:id/lignes',         admin, ventesController.modifierLignes)
router.put('/:id/encaisser',      staff, ventesController.reEncaisserVente)
router.put('/:id/reduction',      admin, ventesController.appliquerReduction)
router.put('/:id/annuler',        admin, ventesController.annulerVente)

module.exports = router
