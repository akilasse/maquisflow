const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const cookieParser = require('cookie-parser')

router.use(cookieParser())

router.post('/login',           authController.login)
router.post('/selectionner',    authController.selectionnerEtablissement)
router.post('/refresh',         authController.refresh)
router.post('/logout',          authController.logout)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password',  authController.resetPassword)

module.exports = router