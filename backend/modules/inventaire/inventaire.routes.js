const express = require('express')
const router = express.Router()
const inventaireController = require('./inventaire.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

router.post('/', verifierToken, autoriserRoles('gerant', 'patron'), inventaireController.creerInventaire)
router.put('/:id/ligne', verifierToken, autoriserRoles('gerant', 'patron'), inventaireController.mettreAJourLigne)
router.post('/:id/cloturer', verifierToken, autoriserRoles('gerant', 'patron'), inventaireController.cloturerInventaire)
router.delete('/:id', verifierToken, autoriserRoles('gerant', 'patron'), inventaireController.annulerInventaire)
router.get('/', verifierToken, autoriserRoles('caissier', 'gerant', 'patron'), inventaireController.getInventaires)
router.get('/:id', verifierToken, autoriserRoles('caissier', 'gerant', 'patron'), inventaireController.getInventaire)

module.exports = router