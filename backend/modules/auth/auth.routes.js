// ============================================================
// AUTH ROUTES - Définit les URLs du module Auth
// Chaque route pointe vers la bonne fonction du controller
// ============================================================

const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const cookieParser = require('cookie-parser')

// Middleware pour lire les cookies (refresh token)
router.use(cookieParser())

// POST /api/auth/login
// Corps requis : { email, mot_de_passe }
router.post('/login', authController.login)

// POST /api/auth/refresh
// Rafraîchit l'access token via le cookie refreshToken
router.post('/refresh', authController.refresh)

// POST /api/auth/logout
// Supprime le cookie refreshToken
router.post('/logout', authController.logout)

module.exports = router