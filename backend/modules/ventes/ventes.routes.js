const express = require('express')
const router = express.Router()
const ventesController = require('./ventes.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

router.post(
  '/',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  ventesController.creerVente
)

router.get(
  '/',
  verifierToken,
  autoriserRoles('caissier', 'gerant', 'patron'),
  ventesController.getVentes
)

module.exports = router