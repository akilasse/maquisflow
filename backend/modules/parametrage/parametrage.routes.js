const express = require('express')
const router = express.Router()
const ctrl = require('./parametrage.controller')
const { verifierToken, autoriserRoles } = require('../../middlewares/auth')

// PRODUITS
router.get('/produits', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.getProduits)
router.post('/produits', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.creerProduit)
router.put('/produits/:id', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.modifierProduit)

// FOURNISSEURS
router.get('/fournisseurs', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.getFournisseurs)
router.post('/fournisseurs', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.creerFournisseur)
router.put('/fournisseurs/:id', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.modifierFournisseur)

// UTILISATEURS
router.get('/utilisateurs', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.getUtilisateurs)
router.post('/utilisateurs', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.creerUtilisateur)
router.put('/utilisateurs/:id', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.modifierUtilisateur)

// MAQUIS
router.get('/maquis', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.getMaquis)
router.put('/maquis', verifierToken, autoriserRoles('gerant', 'patron'), ctrl.modifierMaquis)

module.exports = router