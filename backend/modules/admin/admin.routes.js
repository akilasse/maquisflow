const express    = require('express')
const router     = express.Router()
const jwt        = require('jsonwebtoken')
const controller = require('./admin.controller')
const { uploadLogo } = require('../../middlewares/upload')

const verifierAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token manquant' })
  }
  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' })
    }
    req.admin = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide' })
  }
}

router.post('/login',                controller.login)
router.get('/dashboard',             verifierAdmin, controller.getDashboard)
router.get('/maquis',                verifierAdmin, controller.getMaquis)
router.post('/maquis',               verifierAdmin, controller.creerMaquis)
router.put('/maquis/:id',            verifierAdmin, controller.modifierMaquis)
router.put('/maquis/:id/abonnement', verifierAdmin, controller.modifierAbonnement)
router.post('/maquis/:id/logo',      verifierAdmin, uploadLogo, controller.uploadLogoMaquis)
router.post('/utilisateurs',         verifierAdmin, controller.creerUtilisateur)
router.put('/utilisateurs/toggle',   verifierAdmin, controller.toggleUtilisateur)

module.exports = router