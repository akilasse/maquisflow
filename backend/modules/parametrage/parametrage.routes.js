const express = require('express')
const router = express.Router()
const ctrl = require('./parametrage.controller')
const { verifierToken, autoriserRoles, requireMaquis } = require('../../middlewares/auth')
const { uploadProduit, uploadUtilisateur, uploadLogo } = require('../../middlewares/upload')

// PRODUITS
router.get('/produits', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.getProduits)
router.post('/produits', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.creerProduit)
router.put('/produits/:id', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.modifierProduit)
router.post('/produits/:id/photo', verifierToken, autoriserRoles('gerant', 'patron'), uploadProduit, ctrl.uploadPhotoProduit)
router.post('/produits/import', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.importProduits)

// FOURNISSEURS
router.get('/fournisseurs', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.getFournisseurs)
router.post('/fournisseurs', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.creerFournisseur)
router.put('/fournisseurs/:id', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.modifierFournisseur)

// UTILISATEURS
router.get('/utilisateurs', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.getUtilisateurs)
router.post('/utilisateurs', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.creerUtilisateur)
router.put('/utilisateurs/:id', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.modifierUtilisateur)
router.post('/utilisateurs/:id/photo', verifierToken, autoriserRoles('gerant', 'patron'), uploadUtilisateur, ctrl.uploadPhotoUtilisateur)

// MAQUIS
router.get('/maquis', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.getMaquis)
router.put('/maquis', verifierToken, requireMaquis, autoriserRoles('gerant', 'patron'), ctrl.modifierMaquis)
router.post('/maquis/logo', verifierToken, autoriserRoles('gerant', 'patron'), uploadLogo, ctrl.uploadLogoMaquis)

module.exports = router