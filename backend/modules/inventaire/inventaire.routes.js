const express = require('express')
const router = express.Router()
const inventaireController = require('./inventaire.controller')
const { verifierToken, autoriserRoles, requireMaquis } = require('../../middlewares/auth')

router.post('/', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), inventaireController.creerInventaire)
router.put('/:id/ligne', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), inventaireController.mettreAJourLigne)
router.post('/:id/cloturer', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), inventaireController.cloturerInventaire)
router.delete('/:id', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), inventaireController.annulerInventaire)
router.get('/', verifierToken, requireMaquis, autoriserRoles('caissier', 'gerant', 'patron'), inventaireController.getInventaires)
router.get('/:id', verifierToken, requireMaquis, autoriserRoles('caissier', 'gerant', 'patron'), inventaireController.getInventaire)

module.exports = router